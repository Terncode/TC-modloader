import { debounce } from "lodash";
import React from "react";
import styled from "styled-components";
import { ModRaw } from "../modUtils/modInterfaces";
import { TC_Dialog } from "../utils/Dialogs";
import { FileReaderImproved } from "../utils/fileUtils";
import { Logger } from "../utils/logger";
import { TC_Toaster } from "../utils/Toaster";
import { PopupController } from "./controller";

const Curtan = styled.div`
    position: fixed;
    background-color: rgba(0, 0, 0, 0.50);
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    z-index: 99999;
    color: white;
`;
const FileBox = styled.div`
    margin: auto;
    margin-top: 100px;
    padding: 10px;
    width: 100px;
    border: 1px solid white;
    background-color: black;
`;

const File = styled.div`
    margin: auto;
    padding: 10px;
    border: 1px solid white;
    background-color: black;
    white-space: 0;
`;

const Center = styled.div`
    text-align: center;
`;


interface State {
    dragging: boolean;
}

interface Props {

}

export class Draggable extends React.Component<Props, State>  {

    constructor(props:Props){
        super(props);
        this.state = {
            dragging: false,
        };
    }

    componentDidMount(): void {
        window.addEventListener("dragover", this.onDragEnter, false);
        window.addEventListener("dragstart", this.onDragEnter, false);
        window.addEventListener("dragleave", this.onDragLeave, false);
        window.addEventListener("drop", this.onDragDrop, false);
    }
    componentWillUnmount(): void {
        window.removeEventListener("dragover", this.onDragEnter, false);
        window.removeEventListener("dragstart", this.onDragEnter, false);
        window.removeEventListener("dragleave", this.onDragLeave, false);
        window.removeEventListener("drop", this.onDragDrop, false);
        this.stopDragDebounce.cancel();
    }

    private onDragEnter = (event: DragEvent) => {
        event.preventDefault();
        this.setState({dragging: true});
        this.stopDragDebounce.cancel();
    };
    private onDragLeave = (_event: DragEvent) => {
        this.stopDragDebounce();
    };

    private onDragDrop = (event: DragEvent) => {
        event.preventDefault();
        const files = event.dataTransfer.files;
        this.onGetMods(files);
        this.stopDrag();
    };
    onGetMods = async (files:FileList) => {
        const toast = TC_Toaster.makeToast("System", "Processing dragged files").show(Number.MAX_SAFE_INTEGER);

        try {
            Logger.debug("Dragdropped files");
            toast.setDescription(`Reading ${files.length} mods`);
            const rawMods: ModRaw[] = [];
            const errored: File[] = [];
            const promises: Promise<any>[] = [];
            Logger.debug("Processing files");
            for (const file of files) {
                Logger.debug(`Processing file ${file.name}`);
                const filesReader = new FileReaderImproved(file);
                const promise = filesReader.readFile("readAsArrayBuffer")
                    .then(buffer => {
                        Logger.debug(`Processed ${file.name}`);
                        const modRaw: ModRaw = {
                            fileName: file.name,
                            data: buffer
                        };
                        rawMods.push(modRaw);
                        toast.setDescription(`Read ${file.name}`);
                    })
                    .catch(error => {
                        Logger.debug(`Failed ${file.name}`);
                        errored.push(error);
                        Logger.error(error);
                        toast.setDescription(`Failed ${file.name}`);
                    });
                promises.push(promise);
            };
            await Promise.all(promises);

            if (errored.length) {
                Logger.debug(`Showing error to the user`);
                toast.setDescription(`There was an error`).show(1000);
                await TC_Dialog.alert(`Unable to process files\n${errored.map(f => f.name).join("\n")}`);
            }
            toast.setDescription(`Reading done.`).show(1000);
            if (!rawMods.length) {
                Logger.debug(`No mods loaded`);
                toast.setDescription(`No mods processed`).show(1000);
                return;
            }
            await PopupController.processModInstall(rawMods);
        } catch (error) {
            Logger.debug(error);
            console.log(error);
            toast.setType("error").setDescription(`An error has occurred`).show(1000);
        }
    };


    private stopDragDebounce = debounce(this.stopDrag, 250);

    private stopDrag() {
        this.setState({dragging: false});
    }

    render() {
        if(this.state.dragging) {
            return <>
                <Curtan>
                    <FileBox>
                        <File>
                            <div>  _____</div>
                            <div>_______</div>
                            <div>_______</div>
                            <div>_______</div>
                            <div>_______</div>
                            <div>_______</div>
                        </File>
                        <Center>
                        name.tcmod
                        </Center>
                    </FileBox>
                </Curtan>
            </>;
        }
        return null;
    }
}

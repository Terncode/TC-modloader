import React from "react";
import styled from "styled-components";
import { ModMeta, ModRaw } from "../modUtils/modInterfaces";
import { FileInput, FileReaderImproved } from "../utils/fileUtils";

import { TC_Toaster } from "../utils/Toaster";
import ModItem from "./modItem";
import { Button } from "./utils";
import { TC_Dialog } from "../utils/Dialogs";
import { Logger } from "../utils/logger";
import { handleError, sortMods } from "../utils/utils";
import { BackgroundMessageCanUninstall, BackgroundMessageGetInstalled, BackgroundMessageModUninstall } from "../background/backgroundEventInterface";
import { PopupController } from "./controller";

const InstallButton = styled.div`
    
`;
const Div = styled.div`
    flex-grow: 1;
    overflow: auto;
    display: flex;
    flex-direction: column;
`;
const TableDiv = styled.div`
    overflow: auto;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    text-align: center;
    align-items: center;
    border-top: 1px solid white;;

`;


const Table = styled.table`
    flex-direction: column;
    display: flex;
    height: 100%;
    overflow: auto;

    tbody {
        display:block;
        overflow:auto;
    }
    thead, tbody tr {
        display:table;
        width: 100%;
        table-layout:fixed;
    }

    td:nth-child(1), th:nth-child(1) {
        width: 150px;
        border-left: none;
    }
    td:nth-child(3), th:nth-child(3) {
        width: 100px;
    }
    td:nth-child(4), th:nth-child(4) {
        width: 80px;
    }
    td {
        border-top: 1px solid rgb(200,200,200);
        overflow: auto;
    }
    td, th{
        border-left: 1px solid rgb(200,200,200);
        overflow: auto;
    }
`;

const TBody  = styled.tbody`
    overflow: auto;

    border-top: 1px solid white;

    &::-webkit-scrollbar {
      width: 10px;
    }

    &::-webkit-scrollbar-track {
      background: black; 
      border: 1px solid white;
    }
 
    &::-webkit-scrollbar-thumb {
      background: white; 
    }

    &::-webkit-scrollbar-thumb:hover {
      background: rgba(200,200,200); 
      border: 1px solid black; 
    }
`;

interface S {

}
interface P {

}


interface P {
    origin?: string
    active: boolean;
}
interface S {
    showAll: boolean;
    mods: ModMeta[];
}

export default class Mods extends React.Component<P, S> {
    private destroyed = false;
    constructor(props: P) {
        super(props);
        this.state = {
            showAll: false,
            mods: [],
        };
    }

    componentDidMount() {
        this.updateMods();
        PopupController.onUpdate(this.updateMods);
    }
    componentWillUnmount() {
        this.destroyed = true;
    }
    componentDidUpdate(prevProps: Readonly<P>) {
        PopupController.offUpdate(this.updateMods);
        if(prevProps.active !== this.props.active) {
            this.updateMods();
        }
    }

    onModUninstall = async (mod: ModMeta) =>{
        const result = await new Promise<boolean>((resolve) => {
            chrome.runtime.sendMessage({
                type: "can-uninstall",
                data: mod.hash,
            } as BackgroundMessageCanUninstall, res => {
                const error = handleError(res, false);
                if (error) {
                    TC_Dialog.alert("An error has occurred");
                    throw error;
                } else {
                    resolve(res);
                }
            });
        });

        let yes = false;
        if(result) {
            yes = await TC_Dialog.confirm([
                `Hold on! This mod is used by other mods!`,
                `force uninstalling will uninstall other mods`,
                `that relay on this one!`,
                `Are you sure you want to continue?`,
            ].join("\n"));
        } else {
            yes = await TC_Dialog.confirm(`Are you sure you want to uninstall\n ${mod.name}?`);
        }


        if(!yes) return;
        chrome.runtime.sendMessage({type: "mod-uninstall", data: mod.hash} as BackgroundMessageModUninstall, () => {
            if (!this.destroyed) {
                this.updateMods();
            }
        });
    };

    updateMods = () =>  {
        if (this.destroyed) return;
        this.setState({mods: []});
        let activeOrigin = "";
        if (!this.state.showAll) {
            if (!this.props.active) return;
            activeOrigin = this.props.origin;
        }
        Logger.debug("sending response get-installed", activeOrigin);
        chrome.runtime.sendMessage({type: "get-installed", data: activeOrigin} as BackgroundMessageGetInstalled, (response: ModMeta[]) => {
            Logger.debug("got installed mods", response);
            if (!this.destroyed) {
                const error = handleError(response, false);
                if(error) {
                    Logger.error(error);
                    TC_Dialog.alert(error.message);
                } else {
                    this.setState({mods: sortMods(response)});
                }
            }
        });
    };

    get mods() {
        return this.state.mods;
    }

    get getModMessage() {
        if (this.state.showAll) {
            const msg = "Showing all mods";
            return <>
                {msg}
                <Button onClick={() => {this.setState({showAll: false}); requestAnimationFrame(this.updateMods); }}> Hide all mods</Button>
            </>;
        }

        if (this.props.origin) {
            const msg = "Showing origin mods";
            return <>
                {msg}
                <Button onClick={() => {this.setState({showAll: true}); requestAnimationFrame(this.updateMods); }}> show all mods</Button>
            </>;
        }
        return "";
    }

    getModItem = (mod: ModMeta, index: number) => {
        let activeOrigin = "";
        if (!this.state.showAll) {
            activeOrigin = this.props.origin;
        }

        return <ModItem
            key={index}
            modMeta={mod}
            onUpdate={this.updateMods}
            onUninstall={() => this.onModUninstall(mod)}
            origin={activeOrigin}
        ></ModItem>;
    };


    get renderTable() {
        if(!this.props.origin && !this.state.showAll) {
            const message = "This domain is not active! You can add it on the top left coroner or add show all mods";

            return (<TableDiv>
                {message}
                <Button onClick={() => {this.setState({showAll: true}); requestAnimationFrame(this.updateMods); }}>Show all mods</Button>
            </TableDiv>);
        }

        return (<TableDiv>
            <Table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Version</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <TBody>
                    {this.mods.map(this.getModItem)}
                </TBody>
            </Table>
        </TableDiv>);
    }

    onGetMods = async () => {
        const toast = TC_Toaster.makeToast("System", "Awaiting selection").show(Number.MAX_SAFE_INTEGER);
        const input = new FileInput();
        input.allowMultiple(true);
        input.setAcceptType(["tcmod"]);
        try {
            Logger.debug("Retrieving files");
            const files = await input.show();
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
                console.error(errored);
                await TC_Dialog.alert(`Unable to process files\n${errored.map(f => f.name).join("\n")}`);
            }
            toast.setDescription(`Reading done.`).show(1000);
            if (!rawMods.length) {
                Logger.debug(`No mods loaded`);
                toast.setDescription(`No mods processed`).show(1000);
                return;
            }
            await PopupController.processModInstall(rawMods);
            this.updateMods();
        } catch (error) {
            Logger.debug(error);
            console.log(error);
            toast.setType("error").setDescription(`An error has occurred`).show(1000);
        }
    };


    render() {
        return <Div>
            <InstallButton>
                <Button onClick={this.onGetMods}>Install mod</Button>
                {this.getModMessage}
            </InstallButton>
            {this.renderTable}
        </Div>;
    }
}

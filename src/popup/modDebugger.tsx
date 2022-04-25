import { saveAs } from "file-saver";
import React from "react";
import { BackgroundMessageFetchErrors, BackgroundMessageGetInstalled, BackgroundMessageModDeveloper, BackgroundMessageModState } from "../background/backgroundEventInterface";
import { ModMeta } from "../modUtils/modInterfaces";
import { Logger } from "../utils/logger";
import { handleError, sortMods } from "../utils/utils";
import { Border, Button } from "./utils";
import { js as beautify } from "js-beautify";
import { TC_Dialog } from "../utils/Dialogs";
import styled from "styled-components";
import { DEV_URLS } from "../constants";

const Select = styled.select`
    outline: none;
    background-color: black;
    color: white;
    border: 1px solid white;
    margin: 4px 0px
`;


interface P {

}

interface ModMetaErrors extends ModMeta {
    errors?: string[];
    code?: string;
};

interface S {
    enabled: boolean;
    loading: boolean;
    mods: ModMeta[];
    debugging?: ModMetaErrors;
    dev?: boolean;
    isPopup: boolean;
}

export default class ModDebugger extends React.Component<P, S> {
    private destroyed= false;

    constructor(props: P) {
        super(props);
        this.state = {
            enabled: false,
            loading: false,
            mods: [],
            dev: false,
            isPopup: false, // detect is it is popup
        };
    }

    async componentDidMount() {
        this.fetchDeveloperState();
        this.setState({isPopup: true});
    }

    componentWillUnmount() {
        this.destroyed = true;
    }
    private fetchDeveloperState() {
        chrome.runtime.sendMessage({type: "developer-state" } as BackgroundMessageModState, (response: boolean) => {
            if (!this.destroyed) {
                this.setState({dev: response});
            }
        });
    }

    fetchErrors(mod: ModMeta) {
        chrome.runtime.sendMessage({type: "get-mod-internal-data", data: mod.hash} as BackgroundMessageFetchErrors, (response: {errors: any[], code: string}) => {
            if (!this.destroyed) {
                const error = handleError(response, false);
                if(error) {
                    Logger.error(error);
                } else {
                    if(this.state.debugging && this.state.debugging.hash === mod.hash) {
                        const debugging = { ...this.state.debugging };
                        debugging.errors = response.errors;
                        debugging.code = response.code;
                        this.setState({ debugging });
                    }
                }
            }
        });
    }

    fetchMods() {
        chrome.runtime.sendMessage({type: "get-installed", data: ""} as BackgroundMessageGetInstalled, (response: ModMeta[]) => {
            if (!this.destroyed) {
                const error = handleError(response, false);
                if(error) {
                    Logger.error(error);
                } else {
                    this.setState({mods: sortMods(response), loading: false});
                }
            }
        });
    }

    enable = () => {
        this.setState({enabled: true, loading: true});
        this.fetchMods();
    };
    extractCompiledCode = async () => {
        if (this.state.debugging) {
            await TC_Dialog.alert("Extracted code might be hard to read");
            const beautiOptions = { indent_size: 2, space_in_empty_paren: true };
            const code = decodeURIComponent(window.atob(this.state.debugging.code));
            const beutifyCode = beautify(`${code}`, beautiOptions);

            const blob = new Blob([beutifyCode], {
                type: "application/javascript",
            });
            saveAs(blob, `${this.getModName(this.state.debugging)}.js`);
        }
    };
    showErrors = () => {
        if(this.state.debugging) {
            const modName = this.getModName(this.state.debugging);
            if(this.state.debugging.errors.length) {
                Logger.log(`===${modName}===`);
                for (const error of this.state.debugging.errors) {
                    Logger.error(error);
                }
                Logger.log(`===END===`);
            } else {
                Logger.info(`No errors for mod ${modName}`);
            }
        }
    };

    renderModContent() {
        if (!this.state.debugging) {
            return null;
        }

        const mod = this.state.debugging;
        const renderReq = () => {
            if (!mod.requirements.length) return null;
            return <div>
                <h3>Requirements</h3>
                {mod.requirements.map((m, i) =>{
                    return <div key={i} >- {m.dependencyName}-{m.version}</div>;
                })}
            </div>;
        };

        return <Border>
            <h1>[{mod.hash}]{mod.name}-{mod.version}</h1>
            {mod.dependency ? <h3>Dependency mod</h3> : ""}
            {renderReq()}

            {mod.code ? <Button onClick={this.showErrors}>Show errors(console)</Button> : null }
            {mod.code ? <Button onClick={this.extractCompiledCode}>Extract compiled code</Button> : null }

        </Border>;
    };
    private getModName = (m: ModMeta) => `${m.name}-${m.version}`;
    private enableModDeveloper = async () => {
        if(this.state.dev === false) {
            const ok = await TC_Dialog.confirm([
                "This will open developer protcol",
                "You can use urls:",
                ...DEV_URLS,
                "This allows you to quick loading and unloading mods",
            ].join("\n"));
            if(ok) {

                chrome.runtime.sendMessage({type: "developer-change", data: true} as BackgroundMessageModDeveloper, () => {
                    this.fetchDeveloperState();
                });
            }
        } else {
            chrome.runtime.sendMessage({type: "developer-change", data: false} as BackgroundMessageModDeveloper, () => {
                this.fetchDeveloperState();
            });
        }
    };
    get canShowButton() {
        return this.state.isPopup;
    }
    openInNewTab = () => {
        chrome.tabs.create({"url": location.href});
    };

    renderContent() {
        if(this.state.loading) {
            return "Loading...";
        }

        if(this.state.enabled) {

            return <div>
                <Select onChange={event => {
                    const value = event.target.value;
                    const mod = this.state.mods.find(m => this.getModName(m) === value);
                    if(mod) {
                        this.setState({debugging: mod});
                        this.fetchErrors(mod);
                    } else{
                        this.setState({debugging: undefined});
                    }
                }}>
                    <option>none</option>
                    {this.state.mods.map((m,i) => {
                        return <option key={i}>{this.getModName(m)}</option>;
                    })}
                </Select>
                {this.renderModContent()}
            </div>;
        } else {
            return <>
                <Button onClick={this.enable}>Debug mod</Button>
                <Button onClick={() => {
                    window.open(chrome.extension.getURL("/assets/mod-builder.zip"));
                }}>Download mod builder</Button>
                <Button onClick={this.enableModDeveloper} hidden={this.state.dev === undefined}>
                    {this.state.dev === true ? "Disable mod developer" : "Enable mod developer"}
                </Button>
                {this.canShowButton ? <Button onClick={this.openInNewTab}>
                    Open window in new tab
                </Button> : null}
            </>;
        }
    }

    render() {
        return (<Border>
            {this.renderContent()}
        </Border>);
    }
}

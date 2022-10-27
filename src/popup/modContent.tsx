import React from "react";
import styled from "styled-components";
import { BackgroundMessageCheck, BackgroundMessageOriginAdd, BackgroundMessageOriginRemove } from "../background/backgroundEventInterface";
import { BrowserTab } from "../browserCompatibility/browserInterfaces";
import runtime from "../browserCompatibility/browserRuntime";
import tabs from "../browserCompatibility/browserTabs";
import { TC_Toaster } from "../utils/Toaster";
import { getOrigin, handleError } from "../utils/utils";
import Mods from "./mods";
import Popover from "./popover";
import Settings from "./settings";
import { Button } from "./utils";

const Div = styled.div`
    margin: 5px;
    border: 1px solid white;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    overflow: auto;
`;

const Header = styled.div`
    margin-top: 0;
    margin-left: 0;
    display: flex;
`;
const OriginDiv = styled.div`
    border: 1px solid white;
    border-left: none;
    border-top: none;
    flex-grow: 1;
    display: flex;
`;

const OriginH = styled.div`
    width: auto;
    flex-grow: 1;
    text-align: center;
    font-size: 20px;
`;


interface P {

}
type BtnStatus = "Enable" | "Disable" | "Blocked" | "Pending" | "Errored";
interface S {
    popover?: JSX.Element;
    status: BtnStatus;
    origin: string;
    tabInfo?: BrowserTab;
    showSettings: boolean;
}

export default class ModSettings extends React.Component<P, S> {
    private destroyed = false;

    constructor(props: P) {
        super(props);
        this.state = {
            status: "Pending",
            origin: "Loading...",
            showSettings: false,
        };
    }

    componentDidMount() {
        this.updateInfo();
    }
    componentWillUnmount() {
        this.destroyed = true;
    }

    private updateInfo() {
        tabs.query({ active: true, currentWindow: true}).then(tabs => {
            const tab = tabs[0];
            if (tab) {
                const origin = getOrigin(tab.url);
                if (origin) {
                    if (!tab.url.startsWith("http")) {
                        this.setState({
                            origin: origin,
                            status: "Blocked",
                        });
                    } else {
                        runtime.sendMessage({type: "origin-check", data: origin} as BackgroundMessageCheck).then((response: boolean) => {
                            if(!this.destroyed) {
                                const err = handleError(response, false);
                                if (err) {
                                    console.error(err);
                                    this.setState({
                                        origin,
                                        status: "Errored",
                                    });
                                } else {
                                    this.setState({
                                        origin,
                                        status: response ? "Disable" : "Enable",
                                    });
                                }
                            }
                        });
                        this.setState({
                            origin: origin,
                            status: "Enable",
                            tabInfo: tab,
                        });
                    }
                }
            } else if (!origin || origin === "null"){
                this.setState({
                    origin: origin || "Unknown",
                    status: "Blocked",
                });
            }
        });
    }

    get originAddBtnMsg() {
        switch (this.state.status) {
            case "Blocked":
                return "This origin is blocked by chrome";
            case "Pending":
                return "The request is being processed";
            case "Errored":
                return "Extension error";
            default:
                break;
        }

        return "";
    }

    addRemoveClick = () => {
        if(this.state.tabInfo) {
            this.setState({
                status: "Pending",
            });
            const isAdding = this.state.status === "Enable";

            const data = isAdding ?
                                                                {data: this.state.origin, type: "origin-add"} as BackgroundMessageOriginAdd :
                                                                {data: this.state.origin, type: "origin-remove"} as BackgroundMessageOriginRemove;

            runtime.sendMessage(data).then((response: boolean) => {
                const toastDuration = 1000;
                TC_Toaster.makeToast("System",`"${this.state.origin}" ${isAdding ? "Added" : "Removed"}`).show(toastDuration);

                if (!this.destroyed) {
                    const err = handleError(response, false);
                    if (err) {
                        console.error(err);
                        this.setState({ status: "Errored" });

                    } else {
                        this.setState({ status: isAdding ? "Disable" : "Enable"  });

                    }
                }
            });
        }
    };


    private get renderHeder() {
        return <><Header>
            <OriginDiv>
                <Button className={this.originAddBtnMsg ? "disabled" : ""}
                    onClick={this.addRemoveClick}
                    onMouseEnter={(event) => {
                        if (this.originAddBtnMsg) {
                            const bound = (event.target as HTMLButtonElement).getBoundingClientRect();
                            const popover = <Popover x={bound.right + 10} y={bound.top}> {this.originAddBtnMsg} </Popover>;
                            this.setState({
                                popover,
                            });
                        }
                    }}
                    onMouseLeave={() => {
                        this.setState({popover: undefined});
                    }}

                > {this.state.status } </Button>
                <OriginH> {this.state.origin} </OriginH>
            </OriginDiv>
            <Button onClick={() => {
                this.setState({showSettings: !this.state.showSettings});
            }}> Misc </Button>
        </Header>
        </>;
    }
    renderTabContent() {
        if (this.state.showSettings) {
            return <Settings origin={this.originAddBtnMsg ? undefined : this.state.origin} />;
        } else {
            return <Mods origin={this.originAddBtnMsg ? undefined : this.state.origin} active={this.state.status === "Disable"} />;
        }
    }


    render() {
        return (<Div>
            {this.state.popover}
            {this.renderHeder}
            {this.renderTabContent()}
        </Div>);
    }
}

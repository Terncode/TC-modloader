import { faAdd, faMinus, faSpinner, faTriangleExclamation, faTrashCan, faMicrochip } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import styled from "styled-components";
import { BackgroundMessageGetReportModStateGet, BackgroundMessageGetReportModStateSet } from "../background/backgroundEventInterface";
import { ModMeta, ModStatus } from "../modUtils/modInterfaces";
import { getTabs } from "../utils/chrome";
import { TC_Dialog } from "../utils/Dialogs";
import { Logger } from "../utils/logger";
import { getOrigin, handleError } from "../utils/utils";

const Actions = styled.div`
    display: flex;
    flex-direction: row; 
`;

const PreBadge = styled.div`
    position: relative;
`;
const Badge = styled.div`
    position: absolute;
    user-select: none;
    background-color: red;
    border: 1px solid white;
    border-bottom-right-radius: 4px;
    color: white;
    font-size: 8px;
    top: -15px;
    text-shadow: #000000 1px 0 1px;
`;

const DevBadge = styled.div`
    padding: 2px 5px;
    background-color: red;
`;
const DepBadge = styled.div`
    padding: 2px 5px;
    background-color: #d83f11;
`;
const ReqBadge = styled.div`
    padding: 2px 5px;
    background-color: #d88211;
`;


const Button = styled.button`
    outline: none;
    border: 1px solid white;
    margin: 5px;
    background-color: black;
    color: white;
    transition: background-color 0.25s;
    font-size: 15px;
    padding: 5px;
    cursor: pointer;

    &:hover {
        background-color: rgba(255, 255, 255, 0.50) !important;
    }
`;


export interface ModItemProps {
    modMeta: ModMeta;
    origin?: string;
    onUpdate: () => void;
    onUninstall: () => void;
}
type Status = "loading" | "enabled" | "disabled" | "errored";
interface S {
    dependencyMessage: string;
    status: Status;
}

export default class ModItem extends React.Component<ModItemProps, S> {
    private destroyed = false;

    constructor(props: ModItemProps) {
        super(props);
        this.state = {
            dependencyMessage: "",
            status: "loading"
        };
    }

    componentDidMount() {
        this.fetchStatus();
    }
    componentWillUnmount(): void {
        this.destroyed = true;
    }

    getFaIcon(status: Status, depMes: string) {
        switch (status) {
            case "enabled":
                if(depMes) return faMicrochip;
                return faMinus;
            case "disabled":
                if(depMes) return faMicrochip;
                return faAdd;
            case "loading":
                return faSpinner;
            default:
                return faTriangleExclamation;
        }
    }

    fetchStatus() {
        if (this.destroyed) return;
        this.setState({status: "loading"});
        if(this.props.origin) {
            chrome.runtime.sendMessage({
                type: "get-mod-state",
                data: {
                    hash: this.props.modMeta.hash,
                    origin: this.props.origin,
                }} as BackgroundMessageGetReportModStateGet, response => {
                if (this.destroyed) return;
                const error = handleError(response, false);
                if (error) {
                    Logger.error(response);
                    this.setState({status: "errored"});
                } else {
                    const res = response as ModStatus;
                    Logger.error(res);
                    if (res.dependencyError) {
                        this.setState({status: res.enabled ?  "enabled" : "disabled", dependencyMessage: res.dependencyError});
                    } else {
                        this.setState({status: res.enabled ?  "enabled" : "disabled", dependencyMessage: ""});
                    }
                }
            });
        }
    }

    onEnableDisable = () => {
        Logger.error(this.state);
        if (this.state.status === "disabled" || this.state.status === "enabled") {
            if (this.state.dependencyMessage) {
                TC_Dialog.alert(this.state.dependencyMessage);
                return;
            }
            const enable = this.state.status === "disabled";
            this.setState({status: "loading" });
            const modMeta = this.props.modMeta;
            const currentOrigin = this.props.origin;

            chrome.runtime.sendMessage({
                type: "set-mod-state",
                data: {
                    hash: modMeta.hash,
                    origin: currentOrigin,
                    value: enable,
                }
            } as BackgroundMessageGetReportModStateSet, (err) => {
                const error = handleError(err, false);
                if(error) {
                    TC_Dialog.alert(`Unable to ${enable ? "enable" : "disable"} mod`);
                    Logger.error(error);
                } else {
                    if (modMeta.flags.includes("modify-request")) {
                        getTabs().then(async tabs => {
                            const filteredTabs = tabs.filter(tab => getOrigin(tab.url) === currentOrigin);
                            if (filteredTabs.length) {
                                const tabMessage =`Would you like to refresh ${filteredTabs.length > 1? `${filteredTabs.length} active pages?` : "the page?"}`;
                                const message = enable ? [
                                    "This mod requires page modification! It won't work until you refresh the page",
                                    tabMessage,
                                ].join("\n") : [
                                    "This mod requires page modification! The page cannot unmodify modded code",
                                    tabMessage,
                                ].join("\n");

                                const result = await TC_Dialog.confirm(message);
                                if(result) {
                                    for (const tab of filteredTabs) {
                                        chrome.tabs.reload(tab.id);
                                    }
                                }
                            }
                        });
                    }
                    this.props.onUpdate();
                }
                this.fetchStatus();
            });
        }
    };

    get enableDisableButton() {
        const data = this.props.origin;
        if (data) {
            const status = this.state.status;
            const depMes = this.state.dependencyMessage;
            const enabled = status === "enabled";
            const backgroundColor: React.CSSProperties = { backgroundColor: enabled ? "red": "green"  };
            return <Button onClick={this.onEnableDisable} style={backgroundColor}><FontAwesomeIcon icon={this.getFaIcon(status, depMes)}></FontAwesomeIcon></Button>;
        }
        return null;
    }

    unInstall = async () => {
        if(this.state.dependencyMessage && this.state.status === "enabled") {
            const yes = await TC_Dialog.confirm("Uninstalling this mod will also disable mods that relay this mod!\nAre you sure you want to uninstall it?");
            if(!yes) {
                return;
            }
        }

        this.props.onUninstall();
    };

    get modActions() {
        return <Actions>
            {this.enableDisableButton}
            <Button style={{backgroundColor: "red"}}  onClick={this.unInstall}><FontAwesomeIcon icon={faTrashCan}></FontAwesomeIcon></Button>
        </Actions>;
    }

    renderBadge() {
        const mod = this.props.modMeta;
        if(mod.dev && mod.dependency && mod.requirements?.length) {
            return <PreBadge>
                <Badge><DepBadge>Dev + Dep + Req({mod.requirements.length})</DepBadge></Badge>
            </PreBadge>;
        } else if(mod.dependency && mod.requirements?.length) {
            return <PreBadge>
                <Badge><ReqBadge>Dependency + requirements({mod.requirements.length})</ReqBadge></Badge>
            </PreBadge>;
        } else if(mod.requirements?.length) {
            const title = mod.requirements.map(e => `${e.dependencyName}${e.version}`).join("\n");
            return <PreBadge>
                <Badge title={title} ><ReqBadge>Requirements({mod.requirements.length})</ReqBadge></Badge>
            </PreBadge>;
        } else if(mod.dependency && mod.dev) {
            return <PreBadge>
                <DevBadge>Dep-mod</DevBadge>
            </PreBadge>;
        } else if(mod.dependency) {
            return <PreBadge>
                <Badge><DepBadge>Dependency</DepBadge></Badge>
            </PreBadge>;
        } else if (mod.dev) {
            return <PreBadge>
                <Badge>
                    <DevBadge>Dev</DevBadge>
                </Badge>
            </PreBadge>;
        }
        return null;
    }

    render() {
        const mod = this.props.modMeta;
        return (<tr>
            <td>
                {this.renderBadge()}
                <span>{mod.name}</span>
            </td>
            <td>{mod.description}</td>
            <td>{mod.version}</td>
            <td>{this.modActions}</td>
        </tr>);
    }
}

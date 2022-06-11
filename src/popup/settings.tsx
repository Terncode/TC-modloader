import React from "react";
import styled from "styled-components";
import { BackgroundMessageGetOriginSettings, BackgroundMessageSetOriginSettings } from "../background/backgroundEventInterface";
import { ButtonActivationPosition, InjectorType, OriginSettings, StealthMode } from "../interfaces";
import { TC_Dialog } from "../utils/Dialogs";
import { handleError } from "../utils/utils";
import RadioButtons from "./buttonRadio";
import ModDebugger from "./modDebugger";
import { Border } from "./utils";
const Outer = styled.div`
    width: 100%;
    height: 100%;
    overflow: auto;
`;
const Div = styled.div`
    margin: 5px;
    overflow: auto;
    white-space: break-spaces;
`;
interface P {
 origin: string;
}

interface S {
    settings: OriginSettings,
    loaded: boolean;
}

export default class Settings extends React.Component<P, S> {
    private destroyed = false;

    constructor(props: P) {
        super(props);
        this.state = {
            settings: {
                injectorType: InjectorType.Turbo,
                stealthMode: StealthMode.Normal,
                activateButtonPosition: ButtonActivationPosition.Top,
                origin: props.origin,
            },
            loaded: false,
        };
    }

    componentDidMount(): void {
        if(this.props.origin) {
            chrome.runtime.sendMessage({
                type:"get-origin-settings",
                data: this.props.origin
            } as BackgroundMessageGetOriginSettings, data => {
                if (this.destroyed) return;
                const error = handleError(data, false);
                if (error) {
                    console.error(error);
                } else {
                    this.setState({
                        settings: data,
                        loaded: true,
                    });
                }
            });
        }
    }

    componentWillUnmount(): void {
        this.destroyed = true;
    }

    sendUpdateToBackground() {
        requestAnimationFrame(() => {
            chrome.runtime.sendMessage({
                type:"set-origin-settings",
                data: this.state.settings
            } as BackgroundMessageSetOriginSettings, data => {
                const error = handleError(data, false);
                if(error) {
                    console.error(error);
                    TC_Dialog.alert(`${error.message}`);
                }
            });
        });
    }

    renderInjectorSelector() {
        const turbo = this.state.settings.injectorType === InjectorType.Turbo;
        const msg = turbo ?
            "Turbo injector is enable this will heavily cache your modded scripts. If you experience issues try tunning it off"
        : "If you are sick of waiting for scripts to get loaded consider running turbo mode on ;)";
        return <>
            <h3>Injector turbocharger</h3>
            <RadioButtons options={[
                {text: "Normal", value: InjectorType.Normal, selected: this.state.settings.injectorType === InjectorType.Normal},
                {text: "Turbo",  value: InjectorType.Turbo, selected: this.state.settings.injectorType === InjectorType.Turbo},
            ]} onChange={(option) => {
                const settings = {...this.state.settings};
                settings.injectorType = option.value;
                this.setState({settings});
                this.sendUpdateToBackground();
            }}/>
            <div>{msg}</div>
        </>;
    }
    renderStealthSelector() {
        const mode = this.state.settings.stealthMode;
        let msg = "";
        switch (this.state.settings.stealthMode) {
            case StealthMode.Normal:
                msg = "Basic protection.";
                break;
            case StealthMode.Strict:
                msg = "Strict mode enable keep in mind that some of the features such as small messages won't work!";
                break;
        }

        return <>
            <h3>Stealth mode</h3>
            <RadioButtons options={[
                //{ text: "None", value: StealthMode.None,  selected: mode === StealthMode.None },
                { text: "Basic", value: StealthMode.Normal,  selected: mode === StealthMode.Normal },
                { text: "Strict", value: StealthMode.Strict,  selected: mode === StealthMode.Strict },
            ]} onChange={(option) => {
                const settings = {...this.state.settings};
                settings.stealthMode = option.value;
                this.setState({settings});
                this.sendUpdateToBackground();
            }}/>
            <div>
                It is not possible to make extension fully stealthy! It does its best to hide itself from detection.
                Mods might also be compromising extension stealthy system.
                {msg}
            </div>

        </>;
    }
    renderGuiSelector() {
        const msg = [
            "Gui elements disabled due to stealth mode set to strict mode",
            "you can call your in-game mod-menu by double clicking on title above"
        ].join("\n");

        if (this.state.settings.stealthMode === StealthMode.Strict) {
            return <h3>
                {msg}
            </h3>;
        }

        const check = this.state.settings.activateButtonPosition === ButtonActivationPosition.None;
        const message = check && [
            "Gui button is disabled!",
            "you can call your in-game menu by double clicking on title"
        ].join("\n") || "";
        const pos = this.state.settings.activateButtonPosition;
        return <>
            <h3>Gui activator</h3>
            <RadioButtons options={[
                {text: "None", value: ButtonActivationPosition.None, selected:  pos === ButtonActivationPosition.None },
                {text: "Top", value: ButtonActivationPosition.Top, selected:  pos === ButtonActivationPosition.Top },
                {text: "Bottom", value: ButtonActivationPosition.Bottom, selected:  pos === ButtonActivationPosition.Bottom },
                {text: "Right", value: ButtonActivationPosition.Right, selected: pos === ButtonActivationPosition.Right },
                {text: "Left", value: ButtonActivationPosition.Left, selected: pos === ButtonActivationPosition.Left },
            ]} onChange={(option) => {
                const settings = {...this.state.settings};
                settings.activateButtonPosition = option.value;
                this.setState({settings});
                this.sendUpdateToBackground();
            }}/>
            <div>
                {message}

            </div>
        </>;
    }

    renderSettings() {
        if (!this.props.origin) {
            return null;
        }
        if(!this.state.loaded) {
            return "Loading...";
        }

        return <Border>
            <h1>Settings only apply for this domain</h1>

            {this.renderInjectorSelector()}
            {this.renderStealthSelector()}
            {this.renderGuiSelector()}
        </Border>;

    }

    render() {
        return (<Outer>
            <Div>
                {this.renderSettings()}
                <ModDebugger />
            </Div>
        </Outer>);
    }
}

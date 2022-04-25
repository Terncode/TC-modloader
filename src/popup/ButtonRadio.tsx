import React from "react";
import { Button } from "./utils";
interface S {}

interface Option {
    text: string;
    value: any;
    selected: boolean;
}


interface P {
    options: Option[];
    onChange: (value: Option) => void;
}

export default class RadioButtons extends React.Component<P, S> {

    renderButton(value: Option, key: number) {
        return <Button key={key} onClick={() =>{
            if (!value.selected) {
                this.props.onChange(value);
            }
        }} className={value.selected ? "disabled" : ""}>{value.text}</Button>;
    }

    render() {
        return <>
            {this.props.options.map(this.renderButton.bind(this))}
        </>;
    }
}

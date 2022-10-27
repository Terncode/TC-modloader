import React from "react";
import styled from "styled-components";
import { BackgroundMessageOpenInModMenu } from "../background/backgroundEventInterface";
import runtime from "../browserCompatibility/browserRuntime";

const Div = styled.div`
    background-color: rgba(255, 255, 255, 0.25);
    font-size: 15px;
    font-family: dead_space;
    text-align: center;
    padding: 5px;
    margin: 5px;
    text-shadow: 0px 0px 2px #000001;
`;
const Small = styled.span`
    font-size: 15px;
    display: inline;
    font-family: good_timing, monospace;
`;

export default class Banner extends React.Component {
    render() {
        return <Div onDoubleClick={() => {
            runtime.sendMessage({
                type:"open-mod-menu",
            } as BackgroundMessageOpenInModMenu);
        }}><h1>TC's modloader <Small>{VERSION}</Small> </h1></Div>;
    }
}

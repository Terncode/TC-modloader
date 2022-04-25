import React from "react";
import styled from "styled-components";

const PopDiv = styled.div`
    position: fixed;
    z-index: 90000;
    border: 1px solid white;
    min-height: 10px;
    min-width: 10px;
    font-size: 10px;
    padding: 5px;
    background-color: black;
`;

interface P {
    x: number,
    y: number,
}
interface S {
}

export default class Popover extends React.Component<P, S> {
    get style():React. CSSProperties {
        return {
            left: this.props.x,
            top: this.props.y,
        };
    }

    render() {
        return (<PopDiv style={this.style}>
            {this.props.children}
        </PopDiv>);
    }
}

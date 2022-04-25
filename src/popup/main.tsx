import React from "react";
import Banner from "./banner";
import Content from "./modContent";
import styled from "styled-components";
import { Draggable } from "./draggable";

const Div = styled.div`
  width: 770px;
  height: 590px;
  border: 1px solid white;
  background-color: black;
  color: white;
  display: flex;
  flex-direction: column;
  overflow: auto;
  margin: auto;
`;


export default class Main extends React.Component {
    render() {
        return (<Div>
            <Draggable />
            <Banner />
            <Content />
        </Div>);
    }
}

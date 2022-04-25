/// <reference path="../fix.d.ts" />
import ReactDOM from "react-dom";
import React from "react";
import Main from "../popup/main";


const root = document.createElement("div");
document.body.appendChild(root);

ReactDOM.render(
    <Main />,
    root
);

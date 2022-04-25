import styled from "styled-components";

export const Button = styled.button`
    outline: none;
    border: 1px solid white;
    padding: 5px;
    margin: 5px;
    background-color: black;
    color: white;
    transition: background-color 0.25s;

    &.disabled {
        color: rgb(128, 128, 128);
        :hover {
            background-color: transparent;
        }
    }

    &:hover {
        background-color: rgba(255, 255, 255, 0.25);
    }
`;
export const Border = styled.div`
    border: 1px solid white;
    padding: 5px;
`;

import React from 'react';
import { Button } from 'antd';

const AntdButton = ({ type, onClick, children }) => {
    return (
        <Button type={type} onClick={onClick}>
            {children}
        </Button>
    );
};

export default AntdButton;
import { Paper, PaperProps } from "@mantine/core";
import { ReactNode } from "react";

export interface ModalPaperProps extends PaperProps {
    children: ReactNode | string | ReactNode[];
}

export const ModalPaper = (props: ModalPaperProps) => {
    return (
        <Paper
            p="md"
            radius="md"
            shadow="sm"
            mt="xs"
            className="paper-style"
            {...props}
        >
            {props.children}
        </Paper>
    );
};

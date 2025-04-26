import { Paper, PaperProps } from "@mantine/core"

export interface ModalPaperProps extends PaperProps {
    children: any;
}

export const ModalPaper = (props: ModalPaperProps) => {
    return <Paper
        p="md"
        radius="md" 
        shadow="sm"
        mt="xs"
        className="paper-style"
        {...props}
    >{props.children}</Paper>
}
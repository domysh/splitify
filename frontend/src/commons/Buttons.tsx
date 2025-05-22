import {
    Button,
    ButtonProps as MantineButtonProps,
    Tooltip,
} from "@mantine/core";
import { forwardRef, ReactNode } from "react";
import { buttonStyle, gradientButtonStyles } from "@/styles/commonStyles";
import { useMobile } from "@/utils/hooks";
import {
    IconSettings,
    IconTrash,
    IconEdit,
    IconArrowLeft,
} from "@tabler/icons-react";
import { IconLogout, IconPlus, IconCrown, IconHome } from "@tabler/icons-react";

const buttonProps = (props?: { s?: boolean }) => ({
    size: "md",
    radius: "md",
    ...(props?.s ? { h: 40, w: 40, mih: 40, miw: 40 } : {}),
    className: "transparency-on-hover",
    style: buttonStyle,
    variant: "filled",
    p: 0,
});

export interface CustomButtonProps extends MantineButtonProps {
    onClick?: () => void;
}

export const BackButton = forwardRef<HTMLButtonElement, CustomButtonProps>(
    (props, ref) => {
        return (
            <Tooltip
                label="Torna indietro"
                withArrow
                position="bottom"
                disabled={props.disabled}
                color="cyan"
            >
                <Button
                    ref={ref}
                    color="cyan"
                    {...buttonProps({ s: true })}
                    {...props}
                >
                    <IconArrowLeft size={26} />
                </Button>
            </Tooltip>
        );
    },
);

export const HomeButton = forwardRef<HTMLButtonElement, CustomButtonProps>(
    (props, ref) => {
        return (
            <Tooltip
                label="Torna alla home"
                withArrow
                position="bottom"
                disabled={props.disabled}
                color="cyan"
            >
                <Button
                    ref={ref}
                    color="cyan"
                    {...buttonProps({ s: true })}
                    {...props}
                >
                    <IconHome size={26} />
                </Button>
            </Tooltip>
        );
    },
);

export const LogoutButton = forwardRef<HTMLButtonElement, CustomButtonProps>(
    (props, ref) => {
        return (
            <Tooltip
                label="Logout"
                withArrow
                position="bottom"
                disabled={props.disabled}
                color="red"
            >
                <Button
                    color="red"
                    ref={ref}
                    {...buttonProps({ s: true })}
                    {...props}
                >
                    <IconLogout size={26} />
                </Button>
            </Tooltip>
        );
    },
);

export const AdminButton = forwardRef<HTMLButtonElement, CustomButtonProps>(
    (props, ref) => {
        return (
            <Tooltip
                label="Amministrazione"
                withArrow
                position="bottom"
                disabled={props.disabled}
                color="purple"
            >
                <Button
                    ref={ref}
                    {...buttonProps({ s: true })}
                    styles={{
                        // This to prevent Mantine to apply darker background on hover when setting directly color="purple"
                        // Probably due to a postcss behaviour of Mantine css rules
                        root: {
                            background: "purple",
                        },
                    }}
                    {...props}
                >
                    <IconCrown size={26} />
                </Button>
            </Tooltip>
        );
    },
);

export const AddButton = forwardRef<HTMLButtonElement, CustomButtonProps>(
    (props, ref) => {
        return (
            <Tooltip
                label="Aggiungi nuovo"
                withArrow
                position="bottom"
                disabled={props.disabled}
                color="indigo"
            >
                <Button
                    ref={ref}
                    {...buttonProps({ s: true })}
                    variant="gradient"
                    gradient={{ from: "indigo", to: "cyan" }}
                    {...props}
                >
                    <IconPlus size={26} />
                </Button>
            </Tooltip>
        );
    },
);

export const OptionButton = forwardRef<HTMLButtonElement, CustomButtonProps>(
    (props, ref) => {
        return (
            <Tooltip
                label="Opzioni"
                withArrow
                position="bottom"
                disabled={props.disabled}
            >
                <Button
                    ref={ref}
                    color="blue"
                    {...buttonProps({ s: true })}
                    {...props}
                >
                    <IconSettings size={26} />
                </Button>
            </Tooltip>
        );
    },
);

export const DeleteButton = forwardRef<HTMLButtonElement, CustomButtonProps>(
    (props, ref) => {
        return (
            <Tooltip
                label="Elimina"
                withArrow
                position="bottom"
                color="red.6"
                disabled={props.disabled}
            >
                <Button
                    ref={ref}
                    color="red.6"
                    {...buttonProps({ s: true })}
                    variant="light"
                    {...props}
                >
                    <IconTrash size={24} />
                </Button>
            </Tooltip>
        );
    },
);

export const EditButton = forwardRef<HTMLButtonElement, CustomButtonProps>(
    (props, ref) => {
        return (
            <Tooltip
                label="Modifica"
                withArrow
                position="bottom"
                color="violet"
                disabled={props.disabled}
            >
                <Button
                    ref={ref}
                    color="violet"
                    {...buttonProps({ s: true })}
                    variant="filled"
                    {...props}
                >
                    <IconEdit size={22} />
                </Button>
            </Tooltip>
        );
    },
);

export interface SubmitButtonProps extends CustomButtonProps {
    icon?: ReactNode | string;
    responsive?: boolean;
}

export const SubmitButton = forwardRef<HTMLButtonElement, SubmitButtonProps>(
    ({ icon, responsive, ...other }, ref) => {
        const isMobile = useMobile();
        const additionalProps = buttonProps();
        return (
            <Button
                type="submit"
                {...additionalProps}
                size="sm"
                px="md"
                variant={other.color ? "filled" : "gradient"}
                gradient={{ from: "#5056e1", to: "#6a72e1" }}
                fullWidth={responsive && isMobile}
                leftSection={icon}
                styles={gradientButtonStyles}
                ref={ref}
                className={
                    (other.className ?? "") + " " + additionalProps.className
                }
                {...other}
            />
        );
    },
);

export interface CancelButtonProps extends SubmitButtonProps {}

export const CancelButton = forwardRef<HTMLButtonElement, CancelButtonProps>(
    ({ responsive, icon, ...other }, ref) => {
        const isMobile = useMobile();
        const additionalProps = buttonProps();
        return (
            <Button
                {...additionalProps}
                variant="light"
                color="gray"
                type="reset"
                fullWidth={responsive && isMobile}
                ref={ref}
                leftSection={icon}
                size="sm"
                px="md"
                className={
                    (other.className ?? "") + " " + additionalProps.className
                }
                {...other}
            />
        );
    },
);

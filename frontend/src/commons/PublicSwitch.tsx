import { Box, Group, Switch, SwitchProps, Text, Tooltip } from "@mantine/core"
import { IconWorld, IconLock } from '@tabler/icons-react'

export const PublicSwitch = (props:SwitchProps) => {
    return <Box mb="md">
        <Group align="center">
            <Text fw={500}>Visibilità:</Text>
            <Switch
                size="md"
                onLabel={<IconWorld size="1rem" />}
                offLabel={<IconLock size="1rem" />}
                color="indigo"
                labelPosition="left"
                {...props}
            />
            <Tooltip
                label={
                    props.checked
                        ? "La board è accessibile a chiunque conosca l'URL"
                        : "Solo gli utenti autenticati possono accedere alla board"
                }
                position="right"
                withArrow
            >
                <Text 
                    size="sm" 
                    c={props.checked ? "cyan" : "orange"}
                    fw={500}
                    style={{ cursor: 'help' }}
                >
                    {props.checked? "Pubblica" : "Privata"}
                </Text>
            </Tooltip>
        </Group>
        <Text size="xs" c="dimmed" mt={5}>
            {props.checked
                ? "Chiunque abbia il link potrà visualizzare la board." 
                : "Solo gli utenti autorizzati potranno accedere a questa board."}
        </Text>
    </Box>
}
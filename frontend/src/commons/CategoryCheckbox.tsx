import { Box, Checkbox, Group, Loader, Text } from "@mantine/core";

export interface CategoryCheckboxProps {
    checked: boolean;
    loading?: boolean;
    onClick?: () => void;
    readOnly?: boolean;
    label?: string;
}

export const CategoryCheckbox = (
    { checked, loading, onClick, readOnly, label }:CategoryCheckboxProps
) => {
    if (!readOnly) {
        return (
            <Box style={{ position: 'relative', display: 'inline-block' }}>
                <Checkbox
                    checked={checked}
                    color={checked ? "lime" : "red"}
                    onClick={onClick}
                    readOnly
                    label={label}
                    size={label ? "md" : undefined}
                    styles={{
                        input: {
                            cursor: loading ? 'wait' : 'pointer',
                            opacity: loading ? 0.7 : 1,
                            transition: 'opacity 0.2s',
                            '&:checked': {
                                borderColor: 'rgba(100, 108, 255, 0.6)'
                            }
                        }
                    }}
                />
                {loading && (
                    <Box style={{ 
                        position: 'absolute', 
                        top: label ? 5 : -6, 
                        right: label ? -20 : -6,
                        zIndex: 10
                    }}>
                        <Loader color="blue" size={12} />
                    </Box>
                )}
            </Box>
        );
    }
    
    
    return (
        <Group gap="xs">
            <Box 
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    background: 'transparent',
                    border: checked
                        ? '2px solid rgba(100, 108, 255, 0.8)' 
                        : '2px solid rgba(150, 150, 170, 0.5)',
                    backgroundColor: checked
                        ? 'rgba(100, 108, 255, 0.15)' 
                        : 'rgba(50, 50, 60, 0.2)'
                }}
            >
                {checked && (
                    <Box 
                        style={{
                            width: 10,
                            height: 10,
                            borderRadius: 2,
                            backgroundColor: 'rgba(100, 108, 255, 0.8)'
                        }} 
                    />
                )}
            </Box>
            {label && <Text size="sm">{label}</Text>}
        </Group>
    );
};

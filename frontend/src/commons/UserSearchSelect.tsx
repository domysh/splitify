import { useState } from 'react';
import { Select, Loader, SelectProps } from '@mantine/core';
import { searchUsersQuery } from '@/utils/queries';
import { IconSearch } from '@tabler/icons-react';
import { dropdownStyles } from '@/styles/commonStyles';

interface UserSearchSelectProps extends SelectProps {
    onUserSelect: (userId: string | null) => void;
    placeholder?: string;
    disabled?: boolean;
    label?: string;
    required?: boolean;
    error?: string;
    excludeUsersIds?: string[];
}

export const UserSearchSelect = ({ 
    onUserSelect, 
    placeholder = 'Cerca utente...', 
    disabled = false,
    label = 'Utente',
    required = false,
    error,
    excludeUsersIds,
    ...restProps
}: UserSearchSelectProps) => {
    const [searchValue, setSearchValue] = useState('');
    const [value, setValue] = useState<string | null>(null);
    
    const { data, isLoading, isFetching } = searchUsersQuery(searchValue);
    
    
    const handleChange = (newValue: string | null) => {
        setValue(newValue);
        onUserSelect(newValue);
    };
    
    const options = data?.filter(user => 
        (excludeUsersIds && excludeUsersIds.includes(user.id))?false:user
    ).map(user => ({
        value: user.id,
        label: user.username
    })) || [];
    
    return (
        <Select
            label={label}
            placeholder={placeholder}
            disabled={disabled}
            searchable
            clearable
            data={options}
            value={value}
            onChange={handleChange}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            rightSection={isLoading || isFetching ? <Loader size="xs" /> : <IconSearch size={14} />}
            nothingFoundMessage={searchValue.length >= 2 && !isLoading ? "Nessun utente trovato" : null}
            comboboxProps={{
                transitionProps: { transition: 'pop', duration: 200 },
                shadow: 'md',
                withinPortal: true,
            }}
            required={required}
            error={error}
            styles={dropdownStyles}
            {...restProps}
        />
    );
};

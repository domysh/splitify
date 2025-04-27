import Big from 'big.js';
import { format } from 'date-fns';
import { tz } from '@date-fns/tz'

export const formatPrice = (price: number|Big, includeSymbol = true): string => {
    const formattedValue = (price instanceof Big ? price : price/100).toFixed(2).replace('.', ',');
    return includeSymbol ? `${formattedValue} €` : formattedValue;
};

export const formatDate = (timestamp: string | Date, includeTime = true): string => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const formatStr = includeTime ? "d MMMM yyyy 'alle' HH:mm" : "d MMMM yyyy";
    return format(date, formatStr, { in: tz(Intl.DateTimeFormat().resolvedOptions().timeZone) });
};

export const getInitials = (name: string, limit = 2): string => {
    if (!name) return '';
    return name
        .split(' ')
        .map(part => part.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, limit);
};

export const hashColor = (text: string): string => {
    const colors = ['blue', 'cyan', 'grape', 'indigo', 'orange', 'pink', 'red', 'teal', 'violet'];
    const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[Math.abs(hash) % colors.length];
  };

export const truncateText = (text: string, maxLength = 30): string => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

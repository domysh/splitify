import { Box, Tooltip } from "@mantine/core"
import { IconCashBanknote, IconCircleCheck, IconWallet } from "@tabler/icons-react";

export interface BalanceIconProps {
    balance: number;
}

export const BalanceIcon = ({ balance }: BalanceIconProps) => {
    let icon, color, tooltip;
    
    if (balance === 0) {
        icon = <IconCircleCheck size={28} />;
        color = "#51cf66";
        tooltip = "Saldo in pari";
    } else if (balance < 0) {
        icon = <IconWallet size={28} />;
        color = "#ff6b6b";
        tooltip = "Deve ancora pagare";
    } else {
        icon = <IconCashBanknote size={28} />;
        color = "#ffa94d";
        tooltip = "Ha pagato in eccesso";
    }
    
    return <Tooltip label={tooltip} withArrow>
        <Box style={{ 
            color, 
            transition: 'transform 0.2s ease',
        }} 
        className="transparency-on-hover center-flex">
            {icon}
        </Box>
    </Tooltip>
}
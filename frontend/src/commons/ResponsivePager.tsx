import { buttonStyle } from "@/styles/commonStyles";
import { useMobile, useSmallScreen } from "@/utils/hooks";
import { Box, Button, Pagination } from "@mantine/core"
import { IconCaretLeft, IconCaretRight } from "@tabler/icons-react"

export interface ResponsivePagerProps {
    currentPage: number;
    setCurrentPage: (page: number) => void;
    totalPages: number;
}

export const ResponsivePager = ({ currentPage, setCurrentPage, totalPages}: ResponsivePagerProps) => {
    const isMobile = useMobile()
    const isSmallScreen = useSmallScreen()

    return <Box style={{ display: 'flex', justifyContent: 'center' }}>
        {isMobile?<Box className="center-flex" style={{ width: '100%' }}>
            <Button
            onClick={() => setCurrentPage(currentPage > 1 ? currentPage - 1 : 1)}
            disabled={currentPage === 1}
            ml="sm"
            size="sm"
            >

            <IconCaretLeft />{!isSmallScreen && "Precedente"}  
            </Button>
            <Box style={{ flexGrow: 1 }} />
            <Button
            variant="gradient"
            gradient={{ from: 'blue', to: 'cyan' }}
            onClick={() => setCurrentPage(currentPage < totalPages ? currentPage + 1 : totalPages)}
            disabled={currentPage === totalPages}
            mr="sm"
            style={buttonStyle}
            >
            {!isSmallScreen && "Successivo"}<IconCaretRight />
            </Button>
        </Box>:
        <Pagination
            total={totalPages} 
            value={currentPage} 
            onChange={setCurrentPage}
            color="blue"
            radius="md"
            size="md"
        />}
        </Box>
}
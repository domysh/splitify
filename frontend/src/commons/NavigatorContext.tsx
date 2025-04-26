import { useRouteFunctions } from "@/utils/store"
import { useEffect } from "react"
import { BrowserRouter, Routes, useNavigate } from "react-router"

const NavigatorInnerSetter = ({ children }: { children:any }) => {
    const { setNavigate } = useRouteFunctions()
    const navigate = useNavigate()
  
    useEffect(() => {
        setNavigate(navigate)
    }, [navigate])
  
    return <>{children}</>
}
  
const NavigatorContext = ({ children }: { children:any }) => {
    return (
        <BrowserRouter>
        <NavigatorInnerSetter>
            <Routes>
            {children}
            </Routes>
        </NavigatorInnerSetter>
        </BrowserRouter>
    )
}

export default NavigatorContext
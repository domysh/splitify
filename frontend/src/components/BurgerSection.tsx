import { useRouteFunctions } from "@/utils/store";
import { lazy } from "react";
import { NavLink } from "@mantine/core";
import { IconDashboard, IconHome, IconLogout, IconSettings } from "@tabler/icons-react";
import { useCurrentUser } from "@/utils/hooks";
const UserInfoDisplay = lazy(() => import('@/commons/UserInfoDisplay'))

export interface BurgerSectionProps {
  closeNavbar: () => void;
  handleLogout: () => void;
  token: string | null;
    pathLocation: string;
}

const BurgerSection = ({ closeNavbar, handleLogout, token, pathLocation }:BurgerSectionProps) => {
  const navigate = useRouteFunctions(args => args.navigate);
  const currentUser = useCurrentUser()

    return <>
    {token && (
        <>
          <UserInfoDisplay />
          <NavLink
            label="Home"
            mt="md"
            leftSection={<IconHome size="1.2rem" />}
            onClick={() => {
              navigate("/");
              closeNavbar();
            }}
            active={pathLocation === "/"}
            style={{ marginBottom: 8 }}
          />
          {currentUser?.isAdmin && (
            <NavLink
              label="Admin Dashboard"
              leftSection={<IconDashboard size="1.2rem" />}
              onClick={() => {
                navigate("/admin/dashboard");
                closeNavbar();
              }}
              active={pathLocation === "/admin/dashboard"}
              style={{ marginBottom: 8 }}
            />
          )}
          <NavLink
            label="Impostazioni profilo"
            leftSection={<IconSettings size="1.2rem" />}
            onClick={() => {
              navigate("/profile");
              closeNavbar();
            }}
            active={pathLocation === "/profile"}
            style={{ marginBottom: 8 }}
          />

          <NavLink
            label="Logout"
            leftSection={<IconLogout size="1.2rem" />}
            onClick={() => {
              handleLogout()
              closeNavbar();
            }}
            style={{ marginBottom: 8 }}
          />
        </>
      )}
    </>

}

export default BurgerSection;
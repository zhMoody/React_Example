import { useLocation } from "react-router";
import Button from "../../components/common/Button";
import { useUser } from "../../context/UserContext";
import { useStorageState } from "../../hooks/useStorageState";

export const User = () => {
  const { user, login, logout } = useUser();
  const localtion = useLocation();
  const [count, setCount] = useStorageState("count", 0, { ttl: 10 * 1000 });
  const increment = () => {
    setCount((prev) => prev + 1);
  };

  return (
    <div>
      <p>name: {user.name}</p>
      <p>isLoggedIn: {user.isLoggedIn ? "已登录" : "未登录"}</p>
      <p>{localtion.pathname}</p>
      <Button onClick={() => login("张三")} style={{ marginRight: 10 }}>
        登录
      </Button>
      <Button onClick={logout}>退出登录</Button>
      <p>{count}</p>
      <Button onClick={increment}>点击+1</Button>
    </div>
  );
};

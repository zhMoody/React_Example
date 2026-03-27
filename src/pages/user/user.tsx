import { useLocation } from "react-router";
import Button from "../../components/common/Button";
import { useUser } from "../../context/UserContext";
import { useStorageState } from "../../hooks/useStorageState";

export const User = () => {
  const { user, login, logout } = useUser();
  const localtion = useLocation();
  const [count, setCount, clearCount] = useStorageState("count", 0, {
    ttl: 10 * 1000,
  });
  const [obj, setObj, clearObj] = useStorageState("obj", {
    id: 0,
    name: 0,
    age: 0,
  });
  const increment = () => {
    setCount((prev) => prev + 1);
  };

  const changeObj = () => {
    setObj({
      id: 111,
      name: 222,
      age: 31,
    });
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
      <Button onClick={clearCount}>清除</Button>
      <div>
        <code>
          {obj.id}
          {obj.name}
          {obj.age}
        </code>
      </div>
      <Button onClick={changeObj}>修改</Button>
      <Button onClick={clearObj}>清除</Button>
    </div>
  );
};

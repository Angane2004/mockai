import { Link } from "react-router-dom";

export const LogoContainer = () => {
  return (
    <Link to={"/"}>
      <img
        src="/assets/svg/ai-assistant.gif"
        alt=""
        className="w-16 h-16 object-contain"
      />
    </Link>
  );
};

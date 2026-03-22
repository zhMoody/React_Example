import React from "react";
import "./Button.css";

export enum ButtonVariant {
  Primary = "primary",
  Secondory = "secondary",
  Danger = "danger",
  Ghost = "Ghost",
  Link = "link",
}

export enum ButtonSize {
  SM = "sm",
  MD = "md",
  LG = "lg",
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = ButtonVariant.Primary,
  size = ButtonSize.MD,
  loading = false,
  icon,
  disabled,
  className = "",
  ...props
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      className={`lab-btn btn-${variant} btn-${size} ${isDisabled ? "btn-disabled" : ""} ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {loading && <span className="btn-loader"></span>}
      {!loading && icon && <span className="btn-icon">{icon}</span>}
      <span className="btn-text">{children}</span>
    </button>
  );
};

export default Button;

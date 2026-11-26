import React from "react";
import { Check } from "lucide-react";
import { Tooltip } from "./Overlays";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  appearance?: "primary" | "secondary" | "subtle" | "transparent";
  size?: "small" | "medium";
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  appearance = "secondary",
  size = "medium",
  icon,
  children,
  className = "",
  type = "button",
  ...rest
}) => {
  const iconOnly = Boolean(icon && !children);
  const cls = [
    "win-btn",
    `win-btn-${appearance}`,
    size === "small" ? "win-btn-small" : "",
    iconOnly ? "win-btn-icon-only" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={cls} {...rest}>
      {icon}
      {children}
    </button>
  );
};

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  contentBefore?: React.ReactNode;
  contentAfter?: React.ReactNode;
  inputRef?: React.Ref<HTMLInputElement>;
  onChange?: (
    e: React.ChangeEvent<HTMLInputElement>,
    data: { value: string }
  ) => void;
}

export const Input: React.FC<InputProps> = ({
  contentBefore,
  contentAfter,
  inputRef,
  onChange,
  style,
  className = "",
  ...rest
}) => (
  <div className={`win-input-wrap ${className}`} style={style}>
    {contentBefore && (
      <span style={{ color: "var(--win-fg-3)", display: "inline-flex" }}>
        {contentBefore}
      </span>
    )}
    <input
      ref={inputRef}
      className="win-input-el"
      onChange={(e) => onChange?.(e, { value: e.target.value })}
      {...rest}
    />
    {contentAfter && (
      <span style={{ display: "inline-flex", flexShrink: 0 }}>
        {contentAfter}
      </span>
    )}
  </div>
);

interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  onChange?: (
    e: React.ChangeEvent<HTMLTextAreaElement>,
    data: { value: string }
  ) => void;
}

export const Textarea: React.FC<TextareaProps> = ({
  onChange,
  className = "",
  ...rest
}) => (
  <textarea
    className={`win-textarea ${className}`}
    onChange={(e) => onChange?.(e, { value: e.target.value })}
    {...rest}
  />
);

export const Field: React.FC<{
  label?: string;
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, required, children }) => (
  <div className="win-field">
    {label && (
      <label className="win-field-label">
        {label}
        {required && (
          <span style={{ color: "var(--win-danger)", marginLeft: "3px" }}>*</span>
        )}
      </label>
    )}
    {children}
  </div>
);

export const Checkbox: React.FC<{
  checked: boolean;
  onChange?: (
    e: React.ChangeEvent<HTMLInputElement>,
    data: { checked: boolean }
  ) => void;
  label?: string;
  "aria-label"?: string;
}> = ({ checked, onChange, label, "aria-label": ariaLabel }) => (
  <label className="win-checkbox-label">
    {/* Visually hidden (not display:none) so it stays reachable with Tab and Space. */}
    <input
      type="checkbox"
      className="win-checkbox-input"
      checked={checked}
      aria-label={label ? undefined : ariaLabel}
      onChange={(e) => onChange?.(e, { checked: e.target.checked })}
    />
    <span className={`win-checkbox-box ${checked ? "checked" : ""}`}>
      {checked && <Check size={12} strokeWidth={3} />}
    </span>
    {label && <span>{label}</span>}
  </label>
);

export const Switch: React.FC<{
  checked: boolean;
  onChange?: (
    e: React.MouseEvent<HTMLButtonElement>,
    data: { checked: boolean }
  ) => void;
}> = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    className={`win-switch ${checked ? "checked" : ""}`}
    onClick={(e) => onChange?.(e, { checked: !checked })}
  >
    <span className="win-switch-thumb" />
  </button>
);

const RadioGroupContext = React.createContext<{
  name?: string;
  value: string;
  onChange: (val: string) => void;
}>({ value: "", onChange: () => {} });

export const RadioGroup: React.FC<{
  value: string;
  onChange?: (_: unknown, data: { value: string }) => void;
  layout?: "horizontal" | "vertical";
  children: React.ReactNode;
}> = ({ value, onChange, layout = "vertical", children }) => {
  // One name per group, so the browser gives it arrow-key navigation.
  const name = React.useId();
  return (
    <RadioGroupContext.Provider
      value={{
        name,
        value,
        onChange: (val) => onChange?.(null, { value: val }),
      }}
    >
      <div className={`win-radio-group ${layout}`} role="radiogroup">
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
};

export const Radio: React.FC<{ value: string; label: string; description?: string }> = ({
  value,
  label,
  description,
}) => {
  const ctx = React.useContext(RadioGroupContext);
  const checked = ctx.value === value;
  const radio = (
    <label className="win-radio-label">
      {/* Visually hidden (not display:none) so it stays reachable with Tab and arrow keys. */}
      <input
        type="radio"
        className="win-checkbox-input"
        name={ctx.name}
        value={value}
        checked={checked}
        aria-description={description}
        onChange={() => ctx.onChange(value)}
      />
      <span className={`win-radio-circle ${checked ? "checked" : ""}`} />
      <span>{label}</span>
    </label>
  );
  // The description is a hover tooltip (and read out by screen readers), so every option
  // stays a single line with the circle centred on it.
  return description ? <Tooltip content={description}>{radio}</Tooltip> : radio;
};

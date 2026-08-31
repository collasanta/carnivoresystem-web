"use client";

import { cn } from "@/lib/utils";

export function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-[10px] tracking-[0.2em] text-salt uppercase"
    >
      {children}
    </label>
  );
}

export const inputClass =
  "w-full min-w-0 border border-edge bg-smoke px-3.5 py-2.5 text-[13px] text-bone placeholder:text-salt/70 focus:border-ember focus:outline-2 focus:outline-offset-2 focus:outline-ember";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, props.className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputClass, "resize-y leading-relaxed", props.className)} />;
}

export interface Choice<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

/**
 * A row of mutually exclusive options as buttons rather than a select.
 *
 * Every choice stays visible, which matters here: the tenure and salt questions
 * only get honest answers when people can see that "pink salt" is an option
 * someone expected them to pick.
 */
export function ChoiceGroup<T extends string>({
  legend,
  choices,
  value,
  onChange,
  columns = 2,
}: {
  legend: string;
  choices: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
  columns?: 2 | 3;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-[10px] tracking-[0.2em] text-salt uppercase">{legend}</legend>
      <div className={cn("grid gap-2", columns === 3 ? "grid-cols-3" : "grid-cols-2")}>
        {choices.map((choice) => {
          const selected = choice.value === value;
          return (
            <button
              key={choice.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(choice.value)}
              className={cn(
                "border px-2.5 py-2.5 text-left text-[12px] leading-tight transition-colors duration-150",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember",
                selected
                  ? "border-ember bg-ember/10 text-bone"
                  : "border-edge bg-smoke text-salt hover:border-edge-hover hover:bg-mod-hover hover:text-bone",
              )}
            >
              <span className={cn("block", selected && "font-bold")}>{choice.label}</span>
              {choice.hint && (
                <span className="mt-0.5 block text-[10px] text-salt">{choice.hint}</span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Toggle({
  pressed,
  onToggle,
  children,
}: {
  pressed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={cn(
        "border px-2.5 py-1.5 text-left text-[11px] leading-tight transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember",
        pressed
          ? "border-ember bg-ember/10 font-bold text-bone"
          : "border-edge bg-smoke text-salt hover:border-edge-hover hover:bg-mod-hover hover:text-bone",
      )}
    >
      {children}
    </button>
  );
}

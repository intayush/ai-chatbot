import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'> & { actions: {name: string; description: string; }[] }
>(({ className, actions, onKeyDown, onChange, ...props }, ref) => {
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [filteredActions, setFilteredActions] = React.useState(actions);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [value, setValue] = React.useState('');

  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  React.useImperativeHandle(ref, () => textareaRef.current!);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if(event.key === 'Backspace' && value === "" && showDropdown) {
      setShowDropdown(false);
    }
    else if (event.key === '@') {
      setShowDropdown(true);
      setFilteredActions(actions);
      setSelectedIndex(0);
    } else if (showDropdown) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredActions.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % filteredActions.length);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        setShowDropdown(false)
        selectAction(filteredActions[selectedIndex].name);
      } else if (event.key === 'Escape') {
        setShowDropdown(false);
      }
    }else {
      onKeyDown?.(event);
      if (event.key === 'Enter') {
        setValue("");
      }
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(event.target.value);
    onChange?.(event);
  };

  const selectAction = (action: string) => {
    setValue((prev) => {
      const cursorPos = textareaRef.current?.selectionStart ?? 0;
      console.log(prev.slice(0, cursorPos - 1), '====', `@${action} `, '==', prev.charAt(cursorPos-2));
      return prev.slice(0, cursorPos - 1) + `${prev.charAt(cursorPos-2) === "@" ? "" : "@" }${action} ` + prev.slice(cursorPos);
    });
    setShowDropdown(false);
  };

  return (
    <div className="relative w-full">
      {showDropdown && (
        <div className="absolute bg-white border rounded-md shadow-md w-48 bottom-full mb-2">
          {filteredActions.map((action, index) => (
            <div
              key={action.name}
              className={`p-2 cursor-pointer ${index === selectedIndex ? 'bg-gray-200' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                selectAction(action.name);
              }}
            >
              <p className="text-md font-semibold text-gray-800">{action.name}</p>
              <p className="text-sm text-gray-500">{action.description}</p>
            </div>
          ))}
        </div>
      )}
      <textarea
        onChange={handleChange}
        ref={textareaRef}
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className,
        )}
        onKeyDown={handleKeyDown}
        {...props}
        value={value}
      />
    </div>
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };

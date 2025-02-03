import React, { useCallback, useRef, useState, KeyboardEvent } from 'react';
import classnames from 'classnames'; // v2.3.2
import styles from '../../styles/theme.css';

interface TabsProps {
  /**
   * Array of tab items with their content
   */
  tabs: Array<{
    id: string;
    label: string;
    content: React.ReactNode;
    disabled?: boolean;
  }>;
  /** Currently active tab ID */
  activeTab: string;
  /** Callback when active tab changes */
  onChange: (tabId: string) => void;
  /** Visual variant of the tabs */
  variant?: 'default' | 'contained' | 'underlined';
  /** Tab orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Disable all tabs */
  disabled?: boolean;
  /** Additional CSS class name */
  className?: string;
  /** Accessible label for the tablist */
  ariaLabel?: string;
}

interface KeyboardNavigationHook {
  handleKeyDown: (event: KeyboardEvent) => void;
  focusedTabIndex: number;
}

const useKeyboardNavigation = (
  tabIds: string[],
  activeTab: string,
  onChange: (tabId: string) => void,
  orientation: 'horizontal' | 'vertical'
): KeyboardNavigationHook => {
  const [focusedTabIndex, setFocusedTabIndex] = useState(tabIds.indexOf(activeTab));

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const isRTL = document.dir === 'rtl';
    const tabCount = tabIds.length;
    let newIndex = focusedTabIndex;

    switch (event.key) {
      case 'ArrowLeft':
        if (orientation === 'horizontal') {
          event.preventDefault();
          newIndex = isRTL ? 
            (focusedTabIndex + 1) % tabCount :
            (focusedTabIndex - 1 + tabCount) % tabCount;
        }
        break;
      case 'ArrowRight':
        if (orientation === 'horizontal') {
          event.preventDefault();
          newIndex = isRTL ?
            (focusedTabIndex - 1 + tabCount) % tabCount :
            (focusedTabIndex + 1) % tabCount;
        }
        break;
      case 'ArrowUp':
        if (orientation === 'vertical') {
          event.preventDefault();
          newIndex = (focusedTabIndex - 1 + tabCount) % tabCount;
        }
        break;
      case 'ArrowDown':
        if (orientation === 'vertical') {
          event.preventDefault();
          newIndex = (focusedTabIndex + 1) % tabCount;
        }
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = tabCount - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        onChange(tabIds[focusedTabIndex]);
        break;
      default:
        return;
    }

    setFocusedTabIndex(newIndex);
  }, [focusedTabIndex, tabIds, onChange, orientation]);

  return { handleKeyDown, focusedTabIndex };
};

const Tabs: React.FC<TabsProps> = React.memo(({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
  orientation = 'horizontal',
  disabled = false,
  className,
  ariaLabel = 'Tab navigation'
}) => {
  const tabListRef = useRef<HTMLDivElement>(null);
  const tabIds = tabs.map(tab => tab.id);
  const { handleKeyDown, focusedTabIndex } = useKeyboardNavigation(
    tabIds,
    activeTab,
    onChange,
    orientation
  );

  const tabListClasses = classnames(
    styles.tabs,
    styles[`tabs--${variant}`],
    styles[`tabs--${orientation}`],
    {
      [styles['tabs--disabled']]: disabled
    },
    className
  );

  const getTabClasses = (tabId: string, isDisabled?: boolean) => classnames(
    styles.tab,
    {
      [styles['tab--active']]: tabId === activeTab,
      [styles['tab--disabled']]: isDisabled || disabled,
      [styles['tab--focused']]: tabIds.indexOf(tabId) === focusedTabIndex
    }
  );

  const handleTabClick = (tabId: string, isDisabled?: boolean) => {
    if (!disabled && !isDisabled) {
      onChange(tabId);
    }
  };

  return (
    <div className={tabListClasses}>
      <div
        ref={tabListRef}
        role="tablist"
        aria-label={ariaLabel}
        aria-orientation={orientation}
        onKeyDown={handleKeyDown}
        className={styles.tabList}
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={tab.id === activeTab}
            aria-controls={`panel-${tab.id}`}
            aria-disabled={tab.disabled || disabled}
            tabIndex={tab.id === activeTab ? 0 : -1}
            className={getTabClasses(tab.id, tab.disabled)}
            onClick={() => handleTabClick(tab.id, tab.disabled)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map(tab => (
        <div
          key={`panel-${tab.id}`}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== activeTab}
          className={styles.tabPanel}
          tabIndex={0}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
});

Tabs.displayName = 'Tabs';

export default Tabs;
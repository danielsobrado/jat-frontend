interface DateFormatOptions {
  /** Whether to include timezone in the full format */
  includeTimezone?: boolean;
  /** Whether to use 24-hour format */
  hour24?: boolean;
  /** Custom Intl.DateTimeFormat options for display text */
  displayOptions?: Intl.DateTimeFormatOptions;
  /** Custom Intl.DateTimeFormat options for tooltip text */
  tooltipOptions?: Intl.DateTimeFormatOptions;
}

interface FormattedDate {
  /** Short format for display (e.g., "Mar 28, 2025, 17:30") */
  displayText: string;
  /** Full format for tooltip (e.g., "Mar 28, 2025, 17:30 GST") */
  fullText: string;
}

const defaultDisplayOptions: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
};

const defaultTooltipOptions: Intl.DateTimeFormatOptions = {
  ...defaultDisplayOptions,
  timeZoneName: 'short'
};

/**
 * Format a date string with display text and tooltip text
 * @param dateStr - ISO date string to format
 * @param options - Formatting options
 * @returns Object with displayText and fullText properties
 */
export const formatDate = (
  dateStr: string | undefined | null,
  options: DateFormatOptions = {}
): FormattedDate => {
  if (!dateStr) {
    return { displayText: 'N/A', fullText: 'N/A' };
  }

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      console.error('Invalid date string:', dateStr);
      return { displayText: 'Invalid Date', fullText: 'Invalid Date' };
    }

    const {
      hour24 = true,
      includeTimezone = true,
      displayOptions: customDisplayOptions = {},
      tooltipOptions: customTooltipOptions = {}
    } = options;

    // Merge custom options with defaults
    const displayOpts: Intl.DateTimeFormatOptions = {
      ...defaultDisplayOptions,
      ...customDisplayOptions,
      hour12: !hour24
    };

    const tooltipOpts: Intl.DateTimeFormatOptions = {
      ...defaultTooltipOptions,
      ...customTooltipOptions,
      hour12: !hour24,
      timeZoneName: includeTimezone ? 'short' : undefined
    };

    const displayText = new Intl.DateTimeFormat('default', displayOpts).format(date);
    const fullText = new Intl.DateTimeFormat('default', tooltipOpts).format(date);

    return { displayText, fullText };
  } catch (e) {
    console.error('Error formatting date:', dateStr, e);
    return { displayText: 'Invalid Date', fullText: 'Invalid Date' };
  }
};
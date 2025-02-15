import { DatePicker as TremorDatePicker, type DatePickerValue } from '@tremor/react';

interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  maxDate?: Date;
  minDate?: Date;
}

export const DatePicker = ({ value, onChange, maxDate, minDate }: DatePickerProps) => {
  return (
    <TremorDatePicker
      className='w-full'
      value={value}
      onValueChange={(newValue: DatePickerValue) => {
        if (newValue) {
          onChange(newValue);
        }
      }}
      maxDate={maxDate}
      minDate={minDate}
      enableClear={false}
      placeholder='选择日期'
    />
  );
};

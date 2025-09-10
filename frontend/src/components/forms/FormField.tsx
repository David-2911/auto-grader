import React from 'react';
import {
  TextField as MuiTextField,
  TextFieldProps as MuiTextFieldProps,
  FormControl,
  FormLabel,
  FormHelperText,
  InputAdornment,
} from '@mui/material';
import { useController, Control, FieldPath, FieldValues } from 'react-hook-form';

interface FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends Omit<MuiTextFieldProps, 'name' | 'value' | 'onChange'> {
  name: TName;
  control: Control<TFieldValues>;
  label?: string;
  helperText?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  control,
  label,
  helperText,
  startIcon,
  endIcon,
  ...props
}: FormFieldProps<TFieldValues, TName>) => {
  const {
    field,
    fieldState: { error },
  } = useController({
    name,
    control,
  });

  return (
    <FormControl fullWidth error={!!error}>
      {label && <FormLabel>{label}</FormLabel>}
      <MuiTextField
        {...field}
        {...props}
        error={!!error}
        helperText={error?.message || helperText}
        InputProps={{
          startAdornment: startIcon && (
            <InputAdornment position="start">{startIcon}</InputAdornment>
          ),
          endAdornment: endIcon && (
            <InputAdornment position="end">{endIcon}</InputAdornment>
          ),
          ...props.InputProps,
        }}
      />
    </FormControl>
  );
};

export default FormField;

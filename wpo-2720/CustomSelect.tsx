import { FieldProps, getIn } from 'formik';
import React, { FC, useMemo } from 'react';
import { useIntl } from 'react-intl';
import Select, { OptionsType, ValueType, components } from 'react-select';

import customStyles from './CustomSelectStyle';
import { ICustomSelectOption } from './CustomSelectInterface';
import { getCustomSelectValue } from '../../../helpers/formatForFields';
import { SELECT_ALL_VALUE } from '../../../constants/index';

import styles from './CustomSelect.module.scss';

interface ICustomSelectProps extends FieldProps {
  options: OptionsType<ICustomSelectOption>;
  isMulti?: boolean;
  valueAsObject?: boolean;
  hasEmptyOption?: boolean;
  className?: 'smallSize' | 'noWidth' | string;
  placeholder?: string;
  label: string;
  disabled: boolean;
  handleOnChange?: (id: string | string[], setFieldValue?: any, option?: ValueType<ICustomSelectOption | ICustomSelectOption[]>) => void;
  handleValidateChange?: (id: string|string[]) => boolean;
  isInvalid: boolean;
  errorMessage?: string;
  isRequired?: boolean;
  useEllipses?: boolean;
}

export const CustomSelect: FC<ICustomSelectProps> = ({
  className,
  placeholder,
  label,
  field,
  form,
  options,
  isMulti = false,
  valueAsObject = false,
  hasEmptyOption = false,
  handleOnChange,
  handleValidateChange,
  disabled,
  isInvalid,
  errorMessage,
  isRequired,
  useEllipses
}: ICustomSelectProps) => {

  const intl = useIntl();
  const classNames = className ? className.split(' ').reduce((prev, clName) => (prev + ' ' + styles[clName]), '') : '';

  const allOptions = useMemo(() => [
    ...(hasEmptyOption ? [getCustomSelectValue(intl.formatMessage({ id: 'label.select' }), '')] : []),
    ...(isMulti && options.length !== 0 && field.value.length < options.length ? 
      [getCustomSelectValue(intl.formatMessage({ id: 'label.selectAll' }), SELECT_ALL_VALUE)] : 
      []),
    ...options
  ], [options, hasEmptyOption, intl, isMulti, field]);

  const optionsAsValue: string[] = useMemo(() => options.map((item: ICustomSelectOption) => item.value), [options]);

  const onChange: (option: ValueType<ICustomSelectOption | ICustomSelectOption[]>) => void = (option) => {
    const fieldValue = isMulti
      ? ((Array.isArray(option) && option.map((item: ICustomSelectOption) => item.value)) || [])
      : (option as ICustomSelectOption).value;

    if (handleValidateChange && !handleValidateChange(fieldValue)) {
      return;
    }

    const isSelectAllChosen = Array.isArray(fieldValue) && fieldValue.some(item => item === SELECT_ALL_VALUE);
    if (handleOnChange) {
      handleOnChange(isSelectAllChosen ? optionsAsValue : fieldValue, undefined, isSelectAllChosen ? options : option);
    }

    if(isSelectAllChosen) {
      form.setFieldValue(field.name, valueAsObject ? options : optionsAsValue);
    } else {
      form.setFieldValue(field.name, valueAsObject ? option || [] : fieldValue);
    }
    setTimeout(() => form.setFieldTouched(field.name, true));
  };

  const getValue: () => ValueType<ICustomSelectOption | ICustomSelectOption[]> = () => {
    console.log('values: ', form.values)
    const { email, firstName, lastName } = form.values;
    console.log(email, firstName, lastName);
    if (!email && !firstName && !lastName) {
      console.log('new');
      return options[1]
    } else 
    if (options) {
      console.log('already exist');
      if (valueAsObject) {
        return isMulti
          ? options.filter(option => field.value
            ? Array.isArray(field.value)
              ? field.value.find((fieldValue) => fieldValue.value === option.value)
              : field.value.value.indexOf(option.value) >= 0
            : [])
          : options.find(option => option.value === field.value.value) || '';
      } else {
        return isMulti
          ? options.filter(option => field.value ? field.value.indexOf(option.value) >= 0 : [])
          : options.find(option => option.value === field.value) || '';
      }
    } else {
      return isMulti ? [] : ('' as any);
    }
  };

  const Option = (props): any => {
    return (
      <div { ...(useEllipses && { title: props.data.label, className: styles.withEllipses }) } data-qa={ props.data.value }>
        <components.Option { ...props } />
      </div>
    );
  };

  return (
    <div className={ classNames }>
      {
        label && <label className={ `${ styles.label } ${ isRequired ? styles.required :'' }` }>{ label }</label>
      }
      <Select
        className={ `${ className }${ isInvalid ? ' is-invalid' : '' }` }
        name={ field.name }
        value={ getValue() }
        onChange={ onChange }
        placeholder={ placeholder }
        components={ { Option } }
        options={ allOptions }
        isMulti={ isMulti }
        styles={ customStyles }
        isDisabled={ disabled }
        isInvalid={ isInvalid }
        hideSelectedOptions
      />
      { isInvalid &&
        <div className="text-danger">
          { errorMessage || getIn(form.errors, field.name) }
        </div>
      }
    </div>
  );
};

export default CustomSelect;

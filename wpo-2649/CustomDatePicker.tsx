import React, { FC, useRef } from 'react';
import DatePicker from 'react-datepicker';
import ReactDatePicker from 'react-datepicker';

import { FieldProps, getIn } from 'formik';

import { DATE_PICKER_FORMAT, HOURS_MINUTES_FORMAT } from '../../../constants';
import 'react-datepicker/dist/react-datepicker.css';
import styles from './CustomDatePicker.module.scss';

interface ICustomDatePicker {
  label: string;
  labelDetails?: string;
  isInvalid: boolean;
  isRequired?: boolean;
  isDisabled?: boolean;
  timeOnly?: boolean;
}

const CustomDatePicker: FC<ICustomDatePicker & FieldProps> = ({
  field,
  label,
  labelDetails,
  field: { name, value },
  isInvalid,
  form: { setFieldValue, setFieldTouched, errors },
  isRequired,
  isDisabled,
  timeOnly,
  ...other
}: ICustomDatePicker & FieldProps) => {
  const datePickerRef = useRef<ReactDatePicker>(null);
  let startingDate = 0; 
  if (field.name === 'startDate') {
    startingDate = new Date().setDate(new Date().getDate() - 90 ) 
  }

  return (
    <>
      <div className={ styles.customDatePicker }>
        {
          label &&
          <label className={ `${ styles.label } ${ isRequired ? styles.required :'' }` }>
            { label }
            <span className={ styles.labelDetails }>{ labelDetails }</span>
          </label>
        }
        <DatePicker
          { ...field }
          ref={ datePickerRef }
          autoComplete="off"
          name={ name }
          showTimeSelect={ timeOnly }
          showTimeSelectOnly={ timeOnly }
          className={ styles.datepicker }
          calendarClassName={ styles.calendar }
          disabled={ isDisabled }
          onChange={ (date) => {
            setFieldValue(name, date); 
            setTimeout(() => setFieldTouched(name, true))
          } }
          dateFormat={ timeOnly ? HOURS_MINUTES_FORMAT : DATE_PICKER_FORMAT }
          timeFormat={ HOURS_MINUTES_FORMAT }
          timeIntervals={ 15 }
          selected={ value }
          minDate={ startingDate }
          { ...other }
        />
      </div>
      {
        isInvalid &&
        <div className="text-danger">
          { getIn(errors, name) }
        </div>
      }
    </>
  )
};

export default CustomDatePicker;

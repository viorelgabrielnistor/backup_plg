import React, { FC, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { FieldArray, FormikErrors } from 'formik';
import Form from 'react-bootstrap/Form';

import { IProjectSlaValues, IWorkingScheduleValues } from '../../../services/projectSLA';

import styles from './WorkingSchedule.module.scss';

interface ISlaSettingsProps {
  setFieldValue: (field: string, value: any, shouldValidate?: boolean | undefined) => void;
  setFieldTouched: (field: string, isTouched?: boolean, shouldValidate?: boolean) => void;
  onChange: (e: React.FormEvent<HTMLInputElement>) => void;
  // projectSla: IProjectSlaValues;
  projectSla: any;
}

const SupervisedWorkingSchedule: FC<ISlaSettingsProps> = ({ setFieldValue, setFieldTouched, onChange, projectSla }) => {
  const supervisedTranslation = projectSla.supervisedTranslation;

  const isAll = supervisedTranslation.every(item => item.isOn === true);
  useEffect(() => {
    setFieldValue(`projectSla.supervisedAlways`, isAll);
  }, [supervisedTranslation])
  
  useEffect(() => {
    setFieldValue(`projectSla.hasAgentWorkingSchedule`, supervisedTranslation.some(({ isOn }) => isOn));
    setTimeout(() => setFieldTouched(`projectSla.hasAgentWorkingSchedule`, true));
  }, [supervisedTranslation, setFieldValue, setFieldTouched]);

  return (
    <div className={ `mb-2 ${styles.agentScheduleBlock}` } >
      <table className={ `mb-3 ${styles.table}` }>
        <thead>
          <tr className={ styles.agentScheduleHeader }>
            <th className={ `align-items-center ${ styles.smallTh }` }>
              <FormattedMessage id="label.table.workingDays" /> 
            </th>
            <th >
            </th>
            <th >
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className={ styles.alwaysCheckBox } >
            <td colSpan={ 3 } >
              <span className={ styles.dayCheckLabel } >
                <FormattedMessage id={ 'label.table.selectRecurringDay' } />
              </span>
            </td>
          </tr>
          { supervisedTranslation.map((item, index) => (
            <FieldArray
              key={ 'supervisedTranslation' + index }
              name="projectSla.supervisedTranslation"
              render={ () => (
  
                <tr className={ styles.workDay }>
                  <td >
                    <label className={ styles.dayCheck }>
                      <Form.Check.Input
                        type="checkbox"
                        name={ `projectSla.supervisedTranslation[${index}].isOn` }
                        checked={ item.isOn }
                        onChange={ onChange }
                      />
                      <span className={ styles.dayCheckLabel }>
                        <FormattedMessage id={ `label.table.${item.day}` } />
                      </span>
                    </label>
                  </td>
                </tr>
              ) }
            />
          ))
          }
        </tbody>
      </table>
    </div>
  );
};

export default React.memo(SupervisedWorkingSchedule);

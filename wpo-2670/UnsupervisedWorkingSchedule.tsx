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

const UnsupervisedWorkingSchedule: FC<ISlaSettingsProps> = ({ setFieldValue, setFieldTouched, onChange, projectSla }) => {
  const unsupervisedTranslation = projectSla.unsupervisedTranslation;

  const isAll = unsupervisedTranslation.every(item => item.isOn === true);
  useEffect(() => {
    setFieldValue(`projectSla.unsupervisedAlways`, isAll);
  }, [unsupervisedTranslation])
  
  useEffect(() => {
    setFieldValue(`projectSla.hasAgentWorkingSchedule`, unsupervisedTranslation.some(({ isOn }) => isOn));
    setTimeout(() => setFieldTouched(`projectSla.hasAgentWorkingSchedule`, true));
  }, [unsupervisedTranslation, setFieldValue, setFieldTouched]);

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
          { unsupervisedTranslation.map((item, index) => (
            <FieldArray
              key={ 'unsupervisedTranslation' + index }
              name="projectSla.unsupervisedTranslation"
              render={ () => (
  
                <tr className={ styles.workDay }>
                  <td >
                    <label className={ styles.dayCheck }>
                      <Form.Check.Input
                        type="checkbox"
                        name={ `projectSla.unsupervisedTranslation[${index}].isOn` }
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

export default React.memo(UnsupervisedWorkingSchedule);

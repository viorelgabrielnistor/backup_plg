import React, { FC, useEffect, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import {  FormikErrors } from 'formik';

import { Col, Row } from 'react-bootstrap';
import DatePicker from 'react-multi-date-picker';
import DatePanel from 'react-multi-date-picker/plugins/date_panel';

import styles from './SlaSettings.module.scss';
import { IProjectSlaValues, IWorkingScheduleValues } from '../../../services/projectSLA';
import UnsupervisedWorkingSchedule from './UnsupervisedWorkingSchedule';

interface IUnsupSettingsProps {
  setFieldValue: (field: string, value: any, shouldValidate?: boolean | undefined) => void;
  setFieldTouched: (field: string, isTouched?: boolean, shouldValidate?: boolean) => void;
  projectSla: IProjectSlaValues;
  onChange: (e: React.FormEvent<HTMLInputElement>) => void;
  touchedSla: any;
  errorsSla?: FormikErrors<IWorkingScheduleValues[]> | any;
}

const UnsupSettings: FC<IUnsupSettingsProps> = ({ setFieldValue, setFieldTouched, projectSla, onChange }) => {

  const initTimeframe = projectSla.unsupervisedTimeframe.length ? projectSla.unsupervisedTimeframe : []
  const [timeframe, setTimeframe] = useState<any>(initTimeframe)
  console.log('unsup DP timeframe: ', timeframe)

  const updateDateFormat = (input): [string] => [`${input?.month?.number}/${input?.day}/${input?.year}`]
  
  const res = timeframe.map(item => updateDateFormat(item) )
  console.log(':updateDateFormat: ', updateDateFormat(timeframe[0]))

  const newDates = timeframe;
  console.log('unsup newDates: ', newDates)
  console.log('unsup res: ', res)

  useEffect(() => {
    projectSla = ({
      ...projectSla,
      unsupervisedTimeframe: timeframe,
    })
    setFieldValue(`projectSla.unsupervisedTimeframe`, timeframe);
  }, [timeframe])

  return (
    <Row>
      <Col>
        {
          <>
            <div className={ `mb-2 ${styles.agentScheduleHeader}` }>
              <h6 className={ styles.workingScheduleLabel }>
                <FormattedMessage id="label.table.unsupervisedTimeframe" />
              </h6>
            </div>
            <UnsupervisedWorkingSchedule 
              setFieldValue={ setFieldValue }
              setFieldTouched={ setFieldTouched }
              onChange={ onChange }
              projectSla={ projectSla }
            />
            <div className={ styles.rangeDatePicker } >
              <div className={ styles.title }>
                <span className={ styles.dayCheckLabel }>
                  <FormattedMessage id={ 'label.table.selectTimeRange' } />
                </span>
                <DatePicker 
                  multiple
                  sort
                  value={ timeframe }
                  onChange={ setTimeframe }
                  format={ 'MM/DD/YYYY' }
                  minDate={ new Date() }
                  plugins={ [
                    // eslint-disable-next-line react/jsx-key
                    <DatePanel style={ { width:'125px' } }/>,
                  ] }
                />
              </div>
            </div> 
          </>
        }
      </Col>
    </Row>
  )
};

export default UnsupSettings;

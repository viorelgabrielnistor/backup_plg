import React, { FC, useEffect, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import {  FormikErrors } from 'formik';

import { Col, Row } from 'react-bootstrap';
import DatePicker from 'react-multi-date-picker';
import DatePanel from 'react-multi-date-picker/plugins/date_panel';

import styles from './SlaSettings.module.scss';
import { IProjectSlaValues, IWorkingScheduleValues } from '../../../services/projectSLA';
import SupervisedWorkingSchedule from './SupervisedWorkingSchedule';

interface IUnsupSettingsProps {
  setFieldValue: (field: string, value: any, shouldValidate?: boolean | undefined) => void;
  setFieldTouched: (field: string, isTouched?: boolean, shouldValidate?: boolean) => void;
  projectSla: IProjectSlaValues;
  onChange: (e: React.FormEvent<HTMLInputElement>) => void;
  touchedSla: any;
  errorsSla?: FormikErrors<IWorkingScheduleValues[]> | any;
}

const SupSettings: FC<IUnsupSettingsProps> = ({ setFieldValue, setFieldTouched, projectSla, onChange }) => {

  const initTimeframe = projectSla.supervisedTimeframe.length ? projectSla.supervisedTimeframe : []
  const [timeframe, setTimeframe] = useState<any>(initTimeframe)
  console.log('sup P timeframe: ', timeframe)

  // const updateDateFormat = (input): [string] => [`${input?.month?.number}/${input?.day}/${input?.year}`]
  
  // const res = timeframe.map(item => updateDateFormat(item) )
  // console.log(':updateDateFormat: ', updateDateFormat(timeframe[0]))

  const newDates = timeframe;
  console.log('sup newDates: ', newDates)
  // console.log('sup res: ', res)
  
  useEffect(() => {
    projectSla = ({
      ...projectSla,
      supervisedTimeframe: timeframe,
    })
    setFieldValue(`projectSla.supervisedTimeframe`, timeframe);
  }, [timeframe])

  // console.log('errorLsa: ', errorsSla &&  errorsSla.supervisedTimeframe)

  return (
    <Row>
      <Col>
        {
          <>
            <div className={ `mb-2 ${styles.agentScheduleHeader}` }>
              <h6 className={ styles.workingScheduleLabel }>
                <FormattedMessage id="label.table.supervisedTimeframe" />
              </h6>
            </div>
            <SupervisedWorkingSchedule 
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
                    <DatePanel style={ { width:'125px' } } />,
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

export default SupSettings;

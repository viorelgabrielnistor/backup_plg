import React, { FC, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { FastField, FormikErrors, FormikTouched } from 'formik';

import { ReactComponent as Delete } from '../../../assets/images/Delete.svg';
import { ReactComponent as Disabled } from '../../../assets/images/Disabled.svg';
import NotificationField, { ICON_TYPE } from './NotificationField';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import Col from 'react-bootstrap/Col';
import ReactTooltip from 'react-tooltip';

import { NOTIFICATION_TYPES, REMINDER_TYPES } from '../../../constants/project';
import { ICustomSelectOption } from '../../shared/fields/CustomSelectInterface';
import InputField from '../../shared/fields/InputField';
import { ILanguagePairsValues, IPairValues } from '../../../services/languagePairsInterface';
import projectNotificationsService, {
  ILanguageExpertNotification,
} from '../../../services/projectNotifications';
import { TGetLanguageName } from '../../../store/useLanguages';

import { TOOLTIP_BACKGROUND } from '../../../constants/colors';
import styles from './LanguageExpertNotifications.module.scss';

interface ILanguageExpertNotificationsProps {
  languagePairs: ILanguagePairsValues[];
  languageExpertNotifications: ILanguageExpertNotification[];
  errors: FormikErrors<ILanguageExpertNotification[]> | any;
  touched: FormikTouched<ILanguageExpertNotification[]> | any;
  setFieldValue: any;
  notificationTypes: ICustomSelectOption[];
  reminderTypes: ICustomSelectOption[];
  getLanguageName: TGetLanguageName;
  onChange: (e: React.FormEvent<HTMLInputElement>) => void;
}

const LanguageExpertNotifications: FC<ILanguageExpertNotificationsProps> = ({
  languagePairs,
  languageExpertNotifications,
  touched,
  errors,
  setFieldValue,
  notificationTypes,
  reminderTypes,
  getLanguageName,
  onChange,
}) => {
  const intl = useIntl();

  useEffect(() => {
    const updatedNotifications: ILanguageExpertNotification[] = [];
    languagePairs.forEach((languagePair: ILanguagePairsValues) => {
      languagePair.pairs.forEach(pair => {
        if (pair.from && pair.to) {
          const langPairNotification = languageExpertNotifications.find(
            ({ from, to }) => from === pair.from && to === pair.to
          );
          updatedNotifications.push(langPairNotification || projectNotificationsService.getNewLanguagePairNotification(pair.from, pair.to));
        }
      })
    });
    setFieldValue('notifications.languageExpertNotifications', updatedNotifications);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [languagePairs]);

  return (
    <>
      {
        languagePairs.map((languagePair: ILanguagePairsValues, index) => (
          <div key={ `notifications.languageExpertNotifications.${ index }` }>
            <div
              className={ languagePair.toBeDeleted || !languagePair.active ? styles.disabledPair : '' }
              data-tip={ languagePair.toBeDeleted ?
                intl.formatMessage({ id: 'label.project.notification.delete' }) :
                !languagePair.active ? intl.formatMessage({ id: 'label.project.notification.inactive' }) : '' }
              data-for={ `notifications.languageExpertNotifications.${ index }` }
            >
              {
                languagePair.pairs.map((pair: IPairValues, pairIndex) => {
                  if (!pair.from || !pair.to) {
                    return null;
                  }

                  const langPairNotificationIndex = languageExpertNotifications.findIndex(
                    ({ from, to }) => from === pair.from && to === pair.to
                  );

                  if (langPairNotificationIndex === -1) {
                    return null;
                  }
                  const langPairNotification = languageExpertNotifications[langPairNotificationIndex];

                  return (
                    <div
                      key={ `notifications.languageExpertNotifications.${ langPairNotificationIndex }.pair` }
                      className={ `d-flex align-items-center py-2 ${ pairIndex === 0 ? styles.firstLine : styles.secondLine }` }
                    >
                      <div className="w-20 px-3">
                        <label className={ styles.label }>
                          { languagePair.toBeDeleted && <Delete className={ `${ styles.icon } ${ styles.iconDelete }` } /> }
                          { !languagePair.active && <Disabled className={ `${ styles.icon } ${ styles.iconDisabled }` } /> }
                          { `${ getLanguageName(pair.from) } -> ${ getLanguageName(pair.to) }` }
                        </label>
                      </div>
                      <Col className="d-flex justify-content-between">
                        <Col xl="auto">
                          <NotificationField
                            label={ intl.formatMessage({ id: 'label.project.notifications' }) }
                            name={ `notifications.languageExpertNotifications.${ langPairNotificationIndex }.notification` }
                            options={ notificationTypes }
                            errors={ errors && errors[langPairNotificationIndex]?.notification }
                            touched={ touched && touched[langPairNotificationIndex]?.notification }
                            isFrequencyDisabled={ langPairNotification.notification.type !== NOTIFICATION_TYPES.EVERY_X_MINUTES }
                            iconType={ ICON_TYPE.NOTIFICATION }
                            isSmall
                          />
                        </Col>
                        <Col xl="auto">
                          <NotificationField
                            label={ intl.formatMessage({ id: 'label.project.reminders' }) }
                            name={ `notifications.languageExpertNotifications.${ langPairNotificationIndex }.reminder` }
                            options={ reminderTypes }
                            errors={ errors && errors[langPairNotificationIndex]?.reminder }
                            touched={ touched && touched[langPairNotificationIndex]?.reminder }
                            isFrequencyDisabled={ langPairNotification.reminder.type !== REMINDER_TYPES.EVERY_X_MINUTES }
                            iconType={ ICON_TYPE.REMINDER }
                            isSmall
                          />
                        </Col>
                        {/* {
                          !pairIndex ? 
                            <Col xl="3" xs="3" md="3" lg="3" className={ styles.thresholdInput }>
                              <OverlayTrigger
                                placement="top"
                                overlay={ <Tooltip id="button-thresholdLE"> <FormattedMessage id="label.project.notificationsLEandMng.message" /></Tooltip> }
                              >
                                <FastField
                                  label={ intl.formatMessage({ id: 'label.threshold' }) }
                                  name={ `notifications.languageExpertNotifications.${ langPairNotificationIndex }.languageThreshold` }
                                  type="number"
                                  rows={ 2 }
                                  component={ InputField }
                                  onChange={ onChange }
                                  allowedPattern={ /^([1-9][0-9]{0,2})?$/ }
                                />
                              </OverlayTrigger>
                            </Col>
                            : <Col xs="3" md="3" lg="3"></Col>
                        } */}
                        <Col xl="auto" className={ styles.thresholdInput }>
                          <OverlayTrigger
                            placement="top"
                            overlay={ <Tooltip id="button-thresholdLE"> <FormattedMessage id="label.project.notificationsLEandMng.message" /></Tooltip> }
                          >
                            <FastField
                              label={ intl.formatMessage({ id: 'label.threshold' }) }
                              name={ `notifications.languageExpertNotifications.${ langPairNotificationIndex }.languageThreshold` }
                              type="number"
                              component={ InputField }
                              onChange={ onChange }
                              allowedPattern={ /^([1-9][0-9]{0,2})?$/ }
                            />
                          </OverlayTrigger>
                        </Col>
                      </Col>
                    </div>
                  )
                } )
              }
            </div>
            <ReactTooltip
              className={ styles.tooltip }
              place="right"
              getContent={ (dataTip) => dataTip }
              arrowColor={ TOOLTIP_BACKGROUND }
              id={ `notifications.languageExpertNotifications.${ index }` }
            />
          </div>
        ))
      }
    </>
  );
};

const skipRender = (prevProps: ILanguageExpertNotificationsProps, nextProps: ILanguageExpertNotificationsProps): boolean => {
  return JSON.stringify(prevProps.languageExpertNotifications) === JSON.stringify(nextProps.languageExpertNotifications) &&
    JSON.stringify(prevProps.languagePairs) === JSON.stringify(nextProps.languagePairs) &&
    JSON.stringify(prevProps.touched) === JSON.stringify(nextProps.touched) &&
    JSON.stringify(prevProps.errors) === JSON.stringify(nextProps.errors);
};

export default React.memo(LanguageExpertNotifications, skipRender);

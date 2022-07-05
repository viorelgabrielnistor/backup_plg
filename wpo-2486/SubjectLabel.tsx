import React, { ChangeEvent, FC } from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { FormattedMessage, useIntl } from 'react-intl';
import { Field, FormikErrors, FormikTouched, getIn } from 'formik';

import CustomSelect from '../../shared/fields/CustomSelect';
import InputField from '../../shared/fields/InputField';
import ToggleButton from '../../shared/fields/ToggleButton';
import CustomTextArea from '../../shared/fields/CustomTextArea';
import { IStandardTextCategory } from '../../../services/standardText/standardTextInterface';
import { standardTextApi } from '../../../api/standardTextApi';
import useHandleErrors from '../../../hooks/useHandleErrors';
import { toast } from 'react-toastify';

import styles from './AddEditCategory.module.scss';

interface ISubjectLabelProps {
  subjectIndex: number;
  labelIndex: number;
  handleChange: { (e: ChangeEvent<any>): void; <T = string | ChangeEvent<any>>(field: T): T extends ChangeEvent<any> ? void : (e: string | ChangeEvent<any>) => void };
  touched: FormikTouched<IStandardTextCategory>;
  errors: FormikErrors<IStandardTextCategory>;
  values: IStandardTextCategory;
  language: string;
  client: string;
}

const SubjectLabel: FC<ISubjectLabelProps> = ({
  subjectIndex,
  labelIndex,
  handleChange,
  touched,
  errors,
  values,
  language,
  client
}) => {
  const intl = useIntl();
  const [ handleErrors ] = useHandleErrors();

  const toggleLabel = async (): Promise<void> => {
    try {
      const label = values.subjects[ subjectIndex ].labels[ labelIndex ];
      if (!!label.id && !!label.id.length) {
        label.active = label.active ? 0 : 1;
        await standardTextApi.putStandardText(client, language, values.id, values);
        toast.success(intl.formatMessage({ id: 'label.success.status' }))
      }
    } catch (e) {
      handleErrors(e);
    }
  };

  return (
    <>
      <Row className="align-items-center justify-content-between">
        <Col className="d-flex flex-nowrap align-items-center">
          <div className={ styles.labelField }>
            <FormattedMessage id={ 'label.standardText.add.label' } />
          </div>
          <div className={ ` ${ styles.inputWrapper } d-inline-block align-top` }>
            <Field
              type="text"
              placeholder={ intl.formatMessage({ id: 'label.placeholder' }) }
              name={ `subjects[${ subjectIndex }].labels[${ labelIndex }].title` }
              onChange={ handleChange }
              component={ InputField }
              isInvalid={ !!touched && !!errors && getIn(touched, `subjects[${ subjectIndex }].labels[${ labelIndex }].title`) && getIn(errors, `subjects[${ subjectIndex }].labels[${ labelIndex }].title`) }
            />
          </div>
        </Col>
        <Col md={ 6 } className="px-0 d-flex align-items-center">
          <div className={ styles.labelField }>
            <FormattedMessage id={ 'label.standardText.add.project' } />
          </div>
          <div className={ `${styles.selectProjectLabel}` }>
            <Field
              name={ `subjects[${ subjectIndex }].labels[${ labelIndex }].projectOptions` }
              component={ CustomSelect }
              options={ values.subjects[subjectIndex].projectOptions }
              valueAsObject
              placeholder={ intl.formatMessage({ id: 'label.select' }) }
              isMulti={ true }
              isInvalid={ !!touched && !!errors && getIn(touched, `subjects[${ subjectIndex }].labels[${ labelIndex }].projectOptions`) && getIn(errors, `subjects[${ subjectIndex }].labels[${ labelIndex }].projectOptions`) }
            />
          </div>
        </Col>
        <Col className="text-right pl-0">
          <div className={ `${styles.labelField} d-inline-block` }>
            <FormattedMessage id={ 'label.status' } />
          </div>
          <div className="d-inline-block">
            <Field
              name={ `subjects[${ subjectIndex }].labels[${ labelIndex }].active` }
              component={ ToggleButton }
              handleChange={ () => toggleLabel() }
              buttonValues={ [
                {
                  label: intl.formatMessage({ id: 'label.active' }),
                  value: 1
                },
                {
                  label: intl.formatMessage({ id: 'label.inactive' }),
                  value: 0
                }
              ] }
            />
          </div>
        </Col>
      </Row>
      <div className="mb-3 mt-4">
        <Field
          name={ `subjects[${ subjectIndex }].labels[${ labelIndex }].text` }
          onChange={ handleChange }
          rows={ 5 }
          placeholder={ intl.formatMessage({ id: 'label.placeholder.textarea' }) }
          component={ CustomTextArea }
          isInvalid={ !!touched && !!errors && getIn(touched, `subjects[${ subjectIndex }].labels[${ labelIndex }].text`) && getIn(errors, `subjects[${ subjectIndex }].labels[${ labelIndex }].text`) }
        />
        <p> something about text in the client language....</p>
        <Field
          name={ `subjects[${ subjectIndex }].labels[${ labelIndex }].detectedLanguageText` }
          onChange={ handleChange }
          rows={ 5 }
          placeholder={ intl.formatMessage({ id: 'label.placeholder.textarea' }) }
          component={ CustomTextArea }
          isInvalid={ !!touched && !!errors && getIn(touched, `subjects[${ subjectIndex }].labels[${ labelIndex }].detectedLanguageText`) && getIn(errors, `subjects[${ subjectIndex }].labels[${ labelIndex }].detectedLanguageText`) }
        />
      </div>

      <div className={ `${ styles.border } mb-4` } />
    </>
  )
};

export default SubjectLabel;

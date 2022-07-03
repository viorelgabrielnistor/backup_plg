import React, { ChangeEvent, FC, useState } from 'react';
import { Field, FieldArray, FormikErrors, FormikTouched, getIn } from 'formik';
import { useIntl, FormattedMessage } from 'react-intl';
import { toast } from 'react-toastify';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import InputField from '../../shared/fields/InputField';
import ToggleButton from '../../shared/fields/ToggleButton';
import CustomSelect from '../../shared/fields/CustomSelect';
import SubjectLabel from './SubjectLabel';
import {
  standardTextCategoryService
} from '../../../services/standardText/allStandardText';
import { ICategorySubject, IStandardTextCategory, ISubjectLabel } from '../../../services/standardText/standardTextInterface';
import useHandleErrors from '../../../hooks/useHandleErrors';
import { standardTextApi } from '../../../api/standardTextApi';
import ConfirmationModal from '../../shared/confirmationModal/confirmationModal';

import styles from './AddEditCategory.module.scss';
import { ReactComponent as Delete } from '../../../assets/images/Delete.svg';

interface ICategorySubjectProps {
  subjectIndex: number;
  handleChange: { (e: ChangeEvent<any>): void; <T = string | ChangeEvent<any>>(field: T): T extends ChangeEvent<any> ? void : (e: string | ChangeEvent<any>) => void };
  subject: ICategorySubject;
  touched: FormikTouched<IStandardTextCategory>;
  errors: FormikErrors<IStandardTextCategory>;
  setFieldValue: (field: string, value: any, shouldValidate?: boolean | undefined) => void;
  setFieldTouched: any;
  values: IStandardTextCategory;
  language: string;
  client: string;
  categoryId: string;
}

const CategorySubject: FC<ICategorySubjectProps> = ({
  subjectIndex,
  handleChange,
  subject,
  touched,
  errors,
  values,
  language,
  client,
  categoryId,
  setFieldValue,
  setFieldTouched }) => {
  const intl = useIntl();
  const [ handleErrors ] = useHandleErrors();
  const [hideLabels, setHideLabels] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleSubject = async (): Promise<void> => {
    try {
      if (!!subject.id && !!subject.id.length) {
        values.subjects[ subjectIndex ].active = values.subjects[ subjectIndex ].active ? 0 : 1;
        await standardTextApi.putStandardText(client, language, values.id, values);
        toast.success(intl.formatMessage({ id: 'label.success.status' }))
      }
    } catch (e) {
      handleErrors(e);
    }
  };

  const handleSubjectProjectChange = (labels: ISubjectLabel[], setFieldValue, setFieldTouched) => (projects): void => {
    labels.forEach((label, index) => {
      const labelName = `subjects[${ subjectIndex }].labels[${ index }].projectOptions`;
      const removeLabel = label.projectOptions.filter((projectOption) => {
        return projects.some(project => project === projectOption.value);
      });
      setFieldValue(labelName, removeLabel);
      setFieldTouched(labelName, removeLabel, true);
    });
  };

  const clickHandler: (subjectIndex: number) => void = () => {
    setIsDeleteModalOpen(true);
    
    console.log('categoryId: ', categoryId);
    console.log('subjectIndex: ', subjectIndex);
  }
  
  const handleCloseModal: () => void = () => {
    setIsDeleteModalOpen(false);
  };

  // eslint-disable-next-line @typescript-eslint/require-await
  const handleDeleteMessageConfirmation =  async ():  Promise<void> => {
    setIsDeleteModalOpen(false)
    try {
      setIsDeleting(true);

      if (categoryId) {
        // const { data } = await standardTextApi.getStandardTextById( { client, language, categoryId })
        // console.log('subjects: ', data.subjects);
        // console.log('data: ', data);
        // standardTextApi.deleteStandardTextById({ client, language, categoryId })
      }
    } catch (e) {
      handleErrors(e);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Row className={ `${ styles.subjectRow } align-items-center` } >
        <div className={ styles.labelField }>
          <FormattedMessage id={ 'label.standardText.add.subject' } />
        </div>
        <div className={ `${ styles.inputWrapper }` }>
          <Field
            type="text"
            placeholder={ intl.formatMessage({ id: 'label.placeholder' }) }
            name={ `subjects[${ subjectIndex }].name` }
            onChange={ handleChange }
            component={ InputField }
            isInvalid={ !!touched && !!errors && getIn(touched, `subjects[${ subjectIndex }].name`) && getIn(errors, `subjects[${ subjectIndex }].name`) }
          />
        </div>
        <div className={ `${ styles.labelField } ml-5` }>
          <FormattedMessage id={ 'label.status' } />
        </div>
        <div className={ styles.inputWrapper }>
          <Field
            name={ `subjects[${ subjectIndex }].active` }
            component={ ToggleButton }
            handleChange={ () => toggleSubject() }
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
          <Delete onClick={ () => clickHandler(subjectIndex) } className={ styles.deleteIcon } />
        </div>
      </Row>
      <Row className={ `${ styles.subjectRow } align-items-center mb-4` }>
        <div className={ styles.labelField }>
          <FormattedMessage id={ 'label.standardText.add.project' } />
        </div>
        <div className={ styles.selectProject }>
          <Field
            name={ `subjects[${ subjectIndex }].projectOptions` }
            component={ CustomSelect }
            options={ values.projectOptions }
            valueAsObject
            placeholder={ intl.formatMessage({ id: 'label.select' }) }
            isMulti={ true }
            handleOnChange={ handleSubjectProjectChange(values.subjects[subjectIndex].labels, setFieldValue, setFieldTouched) }
            isInvalid={ !!touched && !!errors && getIn(touched, `subjects[${ subjectIndex }].projectOptions`) && getIn(errors, `subjects[${ subjectIndex }].projectOptions`) }
          />
        </div>
        <div className={ `ml-auto ${ styles.collapseBtn }` } onClick={ () => setHideLabels(!hideLabels) }>
          <span className={ `mr-2 ${hideLabels ? styles.caretDown : styles.caretUp }` } />
          <FormattedMessage id={ `label.standardText.${hideLabels ? 'expand' : 'collapse'}` } />
        </div>
      </Row>
      <div className={ hideLabels ? styles.hideLabels : '' }>
        <FieldArray
          name={ `subjects[${ subjectIndex }].labels` }
          render={ (arrayHelpers) => (
            <div className="mx-5">
              {
                subject.labels && subject.labels.length && subject.labels.map((subjectLabel, labelIndex) => (
                  <SubjectLabel
                    key={ labelIndex + '_label' }
                    labelIndex={ labelIndex }
                    subjectIndex={ subjectIndex }
                    handleChange={ handleChange }
                    values={ values }
                    language={ language }
                    client={ client }
                    touched={ touched }
                    errors={ errors }
                    categoryId={ categoryId } />
                ))
              }
              <Row className="mb-4">
                <Col md={ 12 }>
                  <button
                    type="button"
                    className={ ` ${ styles.actionLink } btn btn-link` }
                    onClick={ () => {
                      arrayHelpers.push(standardTextCategoryService.getNewLabel(values.projectOptions));
                    } }
                  >
                    <FormattedMessage id={ 'label.standardText.add.newLabel' } />
                  </button>
                </Col>
              </Row>
            </div>
          ) }
        />
      </div>
      <ConfirmationModal
        show={ isDeleteModalOpen }
        handleClose={ handleCloseModal }
        handleYes={ handleDeleteMessageConfirmation }
        yesButtonText={ intl.formatMessage({ id: 'label.yes' }) }
        title={ intl.formatMessage({ id: 'label.confirmationDeleteStandardReplySubject' }) }
        isLoading={ isDeleting }
      />
    </>
  )
};

export default CategorySubject;

import React, { Dispatch, FC } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Field, getIn, useFormikContext } from 'formik';
import cloneDeep from 'lodash/cloneDeep';

import Loader from '../../../shared/loader/Loader';
import Metadata from '../../metadata/Metadata';
import CustomTextArea, { textareaClasses } from '../../../shared/fields/CustomTextArea';
import { IMetadataTranslation } from '../../../../services/metadata';
import { STATUS_TYPE } from '../../../../constants/translation';
import { IPendingTicket } from '../../../../services/pendingTicket';
import styles from './AgentReply.module.scss';

interface IEditReply {
  index: number;
  metadata: IMetadataTranslation;
  handleSubmit: (
    saveValues: IPendingTicket,
    submitCallback: (data: IPendingTicket) => Promise<void>,
    redirect: boolean,
    successMessageLabel: string
  ) => Promise<void>;
  setEditMode: Dispatch<React.SetStateAction<boolean>>;
  isLastPending: boolean;
  resolveTicket: (ticket: IPendingTicket) => Promise<void>;
  isLoadingResolve: boolean;
  messageWidth: number;
}

const EditReply: FC<IEditReply> = ({ index, metadata, handleSubmit, setEditMode, isLastPending, resolveTicket, isLoadingResolve, messageWidth }) => {
  const intl = useIntl();
  const { values, handleChange, setFieldValue, setFieldTouched, errors, touched } = useFormikContext<IPendingTicket>();
  const translation = values.translations[index];
  const { translatedText, translatedTextCopy } = translation;

  const handleCancel = (): void => {
    setEditMode(false);
    setFieldTouched(`translations[${ index }].metadata`, false);
    setFieldValue(`translations[${ index }].translatedText`, translatedTextCopy);
  };

  const handleOk = (isLastPending: boolean): void => {
    const saveValues: IPendingTicket = cloneDeep(values);
    saveValues.translations[index] = {
      ...saveValues.translations[index],
      translatedTextCopy: translatedText,
      rejectionReason: '',
      rejectionCategory: '',
      status: STATUS_TYPE.VERIFIED,
    };

    setFieldTouched(`translations[${ index }].metadata`);

    setTimeout(() => {
      (async() => {
        try {
          await handleSubmit(saveValues, resolveTicket, isLastPending, 'label.translation.verifySuccess');
          setEditMode(false);
        } catch (e) { return; }
      })();
    }, 100);
  };

  const validateTranslatedText = (value): string | undefined => {
    return value ? undefined : intl.formatMessage({ id: 'label.error.required' })
  };

  const hasError = getIn(errors, `translations[${ index }].translatedText`) && getIn(touched, `translations[${ index }].translatedText`);

  return (
    <>
      <div style={ { minWidth: messageWidth } }>
        <Field
          component={ CustomTextArea }
          className={ `${ textareaClasses.smallSize } ${ styles.translationTextarea } ${ hasError ? styles.error : '' }` }
          name={ `translations[${ index }].translatedText` }
          value={ translatedText }
          onChange={ handleChange }
          validate={ validateTranslatedText }
          rows={ 4 }>
        </Field>
      </div>
      <div className={ styles.editBottom }>
        <button type="button" className={ styles.actionButton } onClick={ handleCancel } data-qa="cancelEdit">
          <FormattedMessage id="label.cancel" />
        </button>

        <div className={ styles.editSubmit }>
          <Metadata
            metadata={ metadata }
            fieldName={ `translations[${ index }].metadata` }
          />

          <button
            className={ styles.submit }
            type="button"
            onClick={ () => handleOk(isLastPending) }
            disabled={ isLoadingResolve }
            data-qa="saveEdit"
          >
            <FormattedMessage
              id={ `label.${ isLastPending ? 'ticket.okFinish' : 'ok' }` }
            />
            { isLoadingResolve && <Loader small /> }
          </button>
        </div>
      </div>
    </>
  );
};

export default EditReply;

import { Field, getIn, useFormikContext } from 'formik';
import React, { Dispatch, FC, useState } from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FormattedMessage, useIntl } from 'react-intl';

import { ReactComponent as Rejected } from '../../../../assets/images/Rejected.svg';
import Loader from '../../../shared/loader/Loader';
import { removeNewLines } from '../../../../helpers';
import useHandleErrors from '../../../../hooks/useHandleErrors';
import useContainerWidth from '../../../../hooks/useContainerWidth';
import { ITicketValues, VALIDATION_TYPE } from '../../../../services/ticket';
import { ITranslationValues } from '../../../../services/translation';
import CustomTextArea, { textareaClasses } from '../../../shared/fields/CustomTextArea';
import styles from './RejectedAgentReply.module.scss';

interface IRejectedAgentReply {
  hasRewriteReply: boolean;
  index: number;
  isLast: boolean;
  hideTranslation?: string;
  handleSendSupervisedTranslation: (rejectionText: string, translationId: string | null) => Promise<ITranslationValues>;
  isTranslationFormValid: (validationType: VALIDATION_TYPE) => Promise<boolean>;
  setDisabledReply: Dispatch<React.SetStateAction<boolean>>;
  triggerScrollToBottom: () => void;
  isTicketClosed?: boolean;
}

const RejectedAgentReply: FC<IRejectedAgentReply> = ({ 
  hasRewriteReply,
  index,
  isLast,
  hideTranslation,
  handleSendSupervisedTranslation,
  isTranslationFormValid,
  setDisabledReply,
  triggerScrollToBottom,
  isTicketClosed
}) => {
  const intl = useIntl();
  const [handleErrors] = useHandleErrors();
  const [editMode, setEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    handleChange,
    setFieldValue,
    values,
    errors,
    touched
  } = useFormikContext<ITicketValues>();

  const handleResendToVerification = async(): Promise<void> => {
    const rejectionText = values.translations[index].rejectionText;
    const translationId = values.translations[index].id;
    const validation = await isTranslationFormValid(VALIDATION_TYPE.TRANSLATE_CUSTOMER);

    if (validation) {
      try {
        setIsSubmitting(true);
        const newTranslation = await handleSendSupervisedTranslation(rejectionText, translationId);
        setDisabledReply(false);
        setEditMode(false);
        setFieldValue('translations', [ ...values.translations.filter(translation => translation.id !== translationId), newTranslation]);
      } catch (e) {
        handleErrors(e);
      }
    }
  };

  const handleRewriteReply = (): void => {
    setEditMode(!editMode);
    setDisabledReply(true);
    
    if(isLast) {
      triggerScrollToBottom();
    }
  };

  const handleCancelButton = (): void => {
    setEditMode(false);
    setFieldValue(`translations[${index}].rejectionText`, values.translations[index].text);
    setDisabledReply(false);
  };
  
  const validateTranslatedText = (value): string | undefined => {
    return value ? undefined : intl.formatMessage({ id: 'label.error.required' })
  };

  const hasError = getIn(errors, `translations[${ index }].rejectionText`) && getIn(touched, `translations[${ index }].rejectionText`);
  const translation = values.translations[index];

  const text = translation.text ? translation.text : <FormattedMessage id="label.chat.deletedMessage" />;

  const [messageRef, messageWidth] = useContainerWidth();

  return (
    <div className={ `${styles.rejectedAgentReply} ${styles.rejected} ${hasRewriteReply ? '' : styles.rewriteReplyWrapper}` }>
      <div className={ styles.textsCopyWrapper }>
        <div className="flex-grow-1">
          <span className={ `${styles.agentReplyText}` }>
            <Rejected className="mr-1" />
            <FormattedMessage id={ `label.chat.rejected` } />
            <OverlayTrigger
              placement="bottom"
              overlay={ <Tooltip id={ `tooltipRejectionCategory` }>
                { translation.rejectionCategory }
              </Tooltip> }
            >
              <span className={ styles.textRejection }>{ translation.rejectionCategory }</span>
            </OverlayTrigger>
            <OverlayTrigger
              placement="bottom"
              overlay={ <Tooltip id={ `tooltipRejectionReason` }>
                <div className={ styles.tooltip }>
                  { translation.rejectionReason }
                </div>
              </Tooltip> }
            >
              <span className={ styles.textRejection }>&quot;{ removeNewLines(translation.rejectionReason) }&quot;</span>
            </OverlayTrigger>
          </span>
          <div className={ styles.texts }>
            <div className={ ` ${styles.textTranslation} font-italic flex-grow-1` } ref={ messageRef }>
              { hideTranslation ? hideTranslation :
                editMode ?
                  <div style={ { minWidth: messageWidth } }>
                    <Field
                      component={ CustomTextArea }
                      name={ `translations[${index}].rejectionText` }
                      className={ `${ textareaClasses.smallSize } ${styles.editable} ${hasError ? styles.error : ''}` }
                      value={ translation.rejectionText }
                      onChange={ handleChange }
                      rows={ 4 }
                      validate={ validateTranslatedText }>
                    </Field>
                  </div>
                  : text }
            </div>
          </div>
          {
            !hideTranslation && translation.text && hasRewriteReply && !editMode &&
              <div className="text-center">
                <button type="button" className={ !isTicketClosed ? styles.rewriteReply : styles.disabledRewriteReply } onClick={ handleRewriteReply } disabled = { isTicketClosed }>
                  <FormattedMessage id="label.chat.rewriteReply" />
                </button>
              </div>
          }
          {
            editMode && 
            <div className="mt-2 d-flex">
              <button
                type="button"
                className={ `${styles.cancelBtn } mr-3` }
                onClick={ handleCancelButton }
              >
                <FormattedMessage id="label.cancel" />
              </button>
              <button
                onClick={ handleResendToVerification }
                type="button"
                className={ styles.resendToVerificationBtn }
                disabled={ isSubmitting }
              >
                <FormattedMessage id="label.resendToVerification" />
                { isSubmitting && <Loader small /> }
              </button>
            </div>
          }
        </div>
      </div>
    </div>
  );
};

export default RejectedAgentReply;

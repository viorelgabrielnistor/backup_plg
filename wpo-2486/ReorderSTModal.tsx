import React, { FC, useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import cloneDeep from 'lodash/cloneDeep';

import { IStandardText, ISubject } from '../../services/standardText/standardTextInterface';
import { standardTextApi } from '../../api/standardTextApi';
import useHandleErrors from '../../hooks/useHandleErrors';
import allStandardTextService from '../../services/standardText/allStandardText';
import { ReactComponent as DragIcon } from '../../assets/images/DragIcon.svg';

import styles from './ReorderSTModal.module.scss';

export interface IReorderStandardTextsModal {
  languageName: string;
  clientName: string;
  client: string;
  language: string;
  show: boolean;
  handleClose: () => void;
  handleTriggerFetchList: () => void;
}

const ReorderStandardTextsModal: FC<IReorderStandardTextsModal> = ({ 
  languageName, 
  clientName, 
  client, 
  language,
  show, 
  handleClose, 
  handleTriggerFetchList }) => {
  const intl = useIntl();
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [selectedSubject, setSelectedSubject] = useState(0);
  const [initialCategoryList, setInitialCategoryList] = useState<IStandardText<ISubject[]>[] | null>(null);
  const [reorderedCategoryList, setReorderedCategoryList] = useState<IStandardText<ISubject[]>[] | null>(null);
  const [ handleErrors ] = useHandleErrors();

  useEffect(() => {
    (async()=>{
      try {
        if (client && language) {
          const { data } = await standardTextApi.getStandardTexts(client, language);
          const categoryList = allStandardTextService.fromAll(data);
          setReorderedCategoryList(categoryList);
          setInitialCategoryList(categoryList);
          console.log('data from getStandardText ', data)
        }
      } catch (e) {
        handleErrors(e);
      }
    })();
    // eslint-disable-next-line
  }, [client, language]);

  const updateSelectedItem = (sourceIndex, destinationIndex, selectedItem, setSelectedItem): void => {
    if (selectedItem === sourceIndex || selectedItem === destinationIndex) {
      setSelectedItem(selectedItem === sourceIndex ? destinationIndex : sourceIndex);
    }

    if (selectedItem > sourceIndex && selectedItem <= destinationIndex) {
      setSelectedItem(selectedItem - 1);
    }

    if (selectedItem < sourceIndex && selectedItem >= destinationIndex) {
      setSelectedItem(selectedItem + 1);
    }
  };

  const modifyOrder = (items, sourceIndex, destinationIndex): void => {
    const [reorderedItem] = items.splice(sourceIndex, 1);
    items.splice(destinationIndex, 0, reorderedItem);
  };

  const handleOnDragEnd = (result, col): void => {
    if (!result.destination || !reorderedCategoryList) return;

    const standardTexts = cloneDeep(reorderedCategoryList);

    switch(col) {
      case 'category':
        modifyOrder(standardTexts, result.source.index, result.destination.index);
        updateSelectedItem(result.source.index, result.destination.index, selectedCategory, setSelectedCategory);
        break;
      case 'subject':
        modifyOrder(standardTexts[selectedCategory].subjects, result.source.index, result.destination.index);
        updateSelectedItem(result.source.index, result.destination.index, selectedSubject, setSelectedSubject);
        break;
      case 'label':
        modifyOrder(standardTexts[selectedCategory].subjects[selectedSubject].labels, result.source.index, result.destination.index);
        break;
    }
    
    setReorderedCategoryList(standardTexts);
  }

  const handleSelectedOptions = (index: number): void => {
    setSelectedCategory(index); 
    setSelectedSubject(0)
  };

  const closeModal = (): void => {
    setSelectedCategory(0);
    setSelectedSubject(0);
    setReorderedCategoryList(initialCategoryList);
    handleClose();
  };

  const handleSubmit = async (): Promise<void> => {
    const formattedCategory = allStandardTextService.toReorderStandardTexts(reorderedCategoryList);
    try {
      await standardTextApi.putStandardTexts(client, language, formattedCategory);
      handleClose();
      handleTriggerFetchList();
    } catch (e) {
      handleErrors(e);
    }
  };

  return (
    <>
      <Modal show={ show } centered backdrop="static" dialogClassName={ styles.wrapper } restoreFocus={ false }>
        <div className="px-4">
          {
            <div className={ `${ styles.title } mb-2` }>
              <FormattedMessage id="label.standardText.reorderStandardTexts" />
            </div>
          }
          <p className="mb-1">
            <FormattedMessage id="label.standardText.dragAndDropDescription" />
          </p>
          <p className="mb-3">
            <FormattedMessage id="label.standardText.applyToAllProjects" />
          </p>
          <div className="d-flex mb-4">
            <div>
              <span className={ `${ styles.labelField } mr-2` }><FormattedMessage id="label.language" /></span>
              <span className={ `${ styles.labelDetails } mr-5` }>{ languageName }</span>
            </div>
            <div>
              <span className={ `${ styles.labelField } mr-2` }><FormattedMessage id="label.table.client" /></span>
              <span className={ `${ styles.labelDetails } mr-5` }>{ clientName }</span>
            </div>
          </div>
          <Row>
            <Col className="pr-0">
              <div className={ `p-3 ${styles.columnHeader}` }>
                <FormattedMessage id="label.standardText.categories" />
              </div>
            </Col>
            <Col className="p-0">
              <div className={ `p-3 ${styles.columnHeader}` }>
                <FormattedMessage id="label.standardText.subjects" />
              </div>
            </Col>
            <Col className="pl-0">
              <div className={ `p-3 ${styles.columnHeader}` }>
                <FormattedMessage id="label.standardText.labels" />
              </div>
            </Col>
          </Row>
          <Row>
            <Col className={ `pr-0 ${styles.scrollableSection}` }>
              <DragDropContext onDragEnd={ (result) => handleOnDragEnd(result, 'category') }>
                <Droppable droppableId="items">
                  {(provided) => (
                    <div { ...provided.droppableProps } ref={ provided.innerRef }>
                      { reorderedCategoryList && reorderedCategoryList.map((item, index) =>
                        <Draggable key={ item.id } draggableId={ item.id } index={ index }>
                          {(provided) => (
                            <div 
                              className={ `pb-2 ${styles.columnItem} ${selectedCategory === index ? styles.selectedItem : ''}` } 
                              { ...provided.draggableProps } 
                              { ...provided.dragHandleProps } 
                              ref={ provided.innerRef }
                              onClick={ () => handleSelectedOptions(index) }
                            >
                              <DragIcon />
                              <span>
                                { item.name }{ item.active ? '' : ` (${ intl.formatMessage({ id: 'label.inactive' }) })`}
                              </span>
                              <span className={ styles.caretRight }/>
                            </div>
                          )}
                        </Draggable>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </Col>
            <Col className={ `p-0 ${styles.columnBorder} ${styles.scrollableSection}` }>
              <DragDropContext onDragEnd={ (result) => handleOnDragEnd(result, 'subject') }>
                <Droppable droppableId="subjects">
                  {(provided) => (
                    <div { ...provided.droppableProps } ref={ provided.innerRef }>
                      { reorderedCategoryList && reorderedCategoryList[selectedCategory].subjects.map((subject, index) => 
                        <Draggable key={ index } draggableId={ index.toString() } index={ index }>
                          {(provided) => (
                            <div 
                              { ...provided.draggableProps } 
                              { ...provided.dragHandleProps }
                              ref={ provided.innerRef }
                              className={ `pb-2 ${styles.columnItem} ${selectedSubject === index ? styles.selectedItem : ''}` }
                              onClick={ () => { setSelectedSubject(index) } }
                            >
                              <DragIcon />
                              <span>
                                { subject.name }{ subject.active ? '' : ` (${ intl.formatMessage({ id: 'label.inactive' }) })`}
                              </span>
                              <span className={ styles.caretRight }/>
                            </div>
                          )}
                        </Draggable>
                      ) }
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </Col>
            <Col className={ `p-0 mr-3 ${styles.scrollableSection}` }>
              <DragDropContext onDragEnd={ (result) => handleOnDragEnd(result, 'label') }>
                <Droppable droppableId="labels">
                  {(provided) => (
                    <div { ...provided.droppableProps } ref={ provided.innerRef }>
                      { reorderedCategoryList && 
                        reorderedCategoryList[selectedCategory].subjects[selectedSubject].labels.map((label, index) => 
                          <Draggable key={ index } draggableId={ index.toString() } index={ index }>
                            {(provided) => (
                              <div 
                                { ...provided.draggableProps } 
                                { ...provided.dragHandleProps }
                                ref={ provided.innerRef }
                                className={ `pb-2 ${styles.columnItem}` }
                              >
                                <DragIcon />
                                <span>
                                  { label.title }{ label.active ? '' : ` (${ intl.formatMessage({ id: 'label.inactive' }) })`}
                                </span>
                              </div>
                            )}
                          </Draggable>
                        ) }
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </Col>
          </Row>
          <div className="d-flex justify-content-between mt-4">
            <button className={ styles.cancelBtn } type="button" onClick={ closeModal } data-qa="cancel">
              <FormattedMessage id="label.cancel" />
            </button>
            <button className={ styles.saveOrderBtn } type="submit" onClick={ handleSubmit } data-qa="create">
              <FormattedMessage id="label.standardText.saveOrder" />
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ReorderStandardTextsModal;

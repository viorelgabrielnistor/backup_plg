import { FC, useState } from 'react'
import React from 'react'
import { FormattedMessage } from 'react-intl';

import useStandardTextCategory from '../../hooks/useStandardTextCategories';
import { IStandardTextCategory } from '../../services/standardText/standardTextInterface';
import useLoggedUserData from '../../store/useLoggedUserData';
import quickRepliesService from '../../services/standardText/quickReplies';
import { SEARCH_MIN_LENGTH } from '../../constants';

import styles from './EasyReplies.module.scss';

interface IEasyReplyProps {
  projectId: string;
  clientId: string;
  quickReplyCallback: (quickReply: string) => void;
}

const EasyReplies: FC<IEasyReplyProps> = ({ projectId, clientId, quickReplyCallback }) => {
  const { loggedUserData: { preferredLanguage } } = useLoggedUserData();
  const [selectedCategory, setSelectedCategory] = useState<IStandardTextCategory | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const [
    filteredCategories, ,
    setFilteredCategories,
    initialCategories
  ] = useStandardTextCategory(clientId, projectId, preferredLanguage);

  const  [query, setQuery] = useState<string>('');

  const search = (search: string): void => {
    setQuery(search);
    // If the user has deleted everything this is to be considered that they want to return to the initial state
    if (search.length === 0) {
      setFilteredCategories(initialCategories);
      setIsSearching(false);
      return;
    }

    // Queries that meet the minimum search length will trigger a search
    // Queries that are not empty and less than the minimum length by design will have no effect
    if (search.length >= SEARCH_MIN_LENGTH) {
      setIsSearching(true);
      setSelectedCategory(null);
      setFilteredCategories(quickRepliesService.search(initialCategories, search));
    }
  };

  const selectLabel = (text: string): void => {
    // console.log('test 1: ', text)
    // In case a label is used reset the entire quick replies state
    setIsSearching(false);
    setSelectedCategory(null);
    setFilteredCategories(initialCategories);
    setQuery('');
    quickReplyCallback(text);
  };

  return (
    <div className={ styles.fullHeight } >
      <div>
        <span className={ styles.quickReplyHeader }>
          <FormattedMessage id="label.quick.search" />
        </span>
        <div className={ styles.customSearchWrapper }>
          <input type="text"
            className={ styles.searchFieldWrapper }
            value={ query }
            onChange={ (e) => {
              search(e.target.value)
            } }/>

        </div>
      </div>

      {/*All categories listing */}
      {
        !selectedCategory && !isSearching &&
        <>
          <span className={ styles.quickReplyHeader }>
            <FormattedMessage id="label.quick.browse" />
          </span>
          <div className={ styles.scrollableContent }>
            {
              !isSearching && filteredCategories && filteredCategories.filter(category => quickRepliesService.displayCategory(category))
                .map((category, categoryIndex) => {
                  return (
                    <div
                      key={ [category.id, categoryIndex].join('_') }
                      onClick={ () => { setSelectedCategory(category) } }
                      className={ styles.categoryName }>
                      { category.name }
                    </div>
                  )
                })
            }
          </div>
        </>
      }

      {/*Selected category and it's subjects and labels*/}
      {
        selectedCategory &&
        <div className={ styles.categoryWrapper }>
          <div
            className={ styles.quickReplyHeader }
            onClick={ () => setSelectedCategory(null) }>
            <span className={ styles.caretLeft }><FormattedMessage id={ 'label.quick.back' } /></span>
          </div>
          <div className={ `${ styles.scrollableContent }` }>
            <div className={ `${ styles.categoryName} ${ styles.selectedCategory }` }>{ selectedCategory.name }</div>
            {
              !isSearching && selectedCategory.subjects.filter(subject => quickRepliesService.displaySubject(subject)).map((subject, subjectIndex) => {
                return (

                  <div key={ [selectedCategory.id, subject.id, subjectIndex].join('_') }>
                    <div className={ styles.subjectTitle }>
                      { subject.name }
                    </div>
                    <div>
                      {
                        subject.labels && subject.labels.filter(label => quickRepliesService.displayLabel(label)).map((label, labelIndex) => {
                          return (
                            <div
                              key={ [selectedCategory.id, subject.id, subjectIndex, label.id, labelIndex].join('_') }>
                              <div
                                className={ styles.labelName }
                                onClick={ () => selectLabel(label.text) }>
                                { label.title }
                              </div>
                            </div>
                          )
                        })
                      }
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      }

      {/*Search Results*/}
      {
        isSearching &&
        <div className={ styles.scrollWrapper }>
          <div
            className={ styles.quickReplyHeader }
            onClick={ () => {
              setFilteredCategories(initialCategories);
              setSelectedCategory(null);
              setIsSearching(false);
              setQuery('');
            } }>
            <span className={ styles.caretLeft }><FormattedMessage id={ 'label.quick.back' } /></span>
          </div>
          {
            filteredCategories && filteredCategories.filter(category => quickRepliesService.displayCategory(category))
              .map((category, categoryIndex) => {
                return (
                  <div key={ [category.id, categoryIndex].join('_') } className={ `${ styles.scrollableContent } ${ styles.searchResult }` }>
                    <div className={ `${ styles.categoryName } ${ styles.selectedCategory }` }>
                      { category.name }
                    </div>
                    {
                      category.subjects.filter(subject => quickRepliesService.displaySubject(subject)).map((subject, subjectIndex) => {
                        return (

                          <div key={ [category.id, subject.id, subjectIndex].join('_') }>
                            <div className={ styles.subjectTitle }>
                              { subject.name }
                            </div>
                            <div>
                              {
                                subject.labels && subject.labels.filter(label => quickRepliesService.displayLabel(label)).map((label, labelIndex) => {
                                  return (
                                    <div
                                      key={ [category.id, subject.id, subjectIndex, label.id, labelIndex].join('_') }>
                                      <div
                                        className={ styles.labelName }
                                        onClick={ () => selectLabel(label.text) }>
                                        { label.title }
                                      </div>
                                    </div>
                                  )
                                })
                              }
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>
                )
              })
          }
        </div>
      }

    </div>
  )
};

export default EasyReplies;

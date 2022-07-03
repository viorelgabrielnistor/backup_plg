import React, { FC } from 'react';
import ReactPaginate from 'react-paginate';

import styles from './Pagination.module.scss';

const Pagination: FC<{ pageCount: number; limit: number; setLimit: any; total?: number, setCpg: any }> = ({ pageCount, limit, setLimit, total, setCpg }) => {
  console.log('pageCount: ', pageCount)
  console.log('limit: ', limit)

  const handlePageClick = (data: { selected: number }): void => {
    const currentPage = data.selected + 1;
    console.log('currentPage: ', currentPage)
    setCpg(currentPage)
  }

  const showOptions = [ 5, 10, 20, total ].map(pageSize => (
    <option key={ Math.random().toString(36).slice(2, 9) } value={ pageSize }>
      Show { pageSize === total ? 'All' : pageSize }
    </option>
  ));

  return <div style={ { display: 'flex', margin: '20px' } }>
    <select
      className={ styles.selectItemsPerPage }
      value={ limit }
      onChange={ e => {
        setLimit(Number(e.target.value))
      } }
    >
      { showOptions }
    </select>
    {
      // pageCount > 1 &&
      <ReactPaginate
        previousLabel={ 'previous' }
        nextLabel={ 'next' }
        breakLabel={ '...' }
        marginPagesDisplayed={ 2 }
        pageRangeDisplayed={ 3 }
        onPageChange={ handlePageClick }
        containerClassName={ 'pagination justify-content-center ' }
        pageClassName={ 'page-item' }
        pageLinkClassName={ 'page-link'  }
        previousClassName={ 'page-item ' }
        previousLinkClassName={ 'page-link' }
        nextClassName={ 'page-item' }
        nextLinkClassName={ 'page-link' }
        breakClassName={ 'page-item' }
        breakLinkClassName={ 'page-link' }
        activeClassName={ 'active' }
        pageCount={ pageCount }
      />
    }
  </div>
}

export default Pagination;

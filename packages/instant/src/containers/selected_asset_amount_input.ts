import { BuyQuote } from '@0x/asset-buyer';
import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';

import { zrxDecimals } from '../constants';
import { Action, actions } from '../redux/actions';
import { State } from '../redux/reducer';
import { ColorOption } from '../style/theme';
import { AsyncProcessState } from '../types';
import { assetBuyer } from '../util/asset_buyer';
import { errorUtil } from '../util/error';

import { AssetAmountInput } from '../components/asset_amount_input';

export interface SelectedAssetAmountInputProps {
    fontColor?: ColorOption;
    fontSize?: string;
}

interface ConnectedState {
    value?: BigNumber;
    assetData?: string;
}

interface ConnectedDispatch {
    onChange: (value?: BigNumber, assetData?: string) => void;
}

const mapStateToProps = (state: State, _ownProps: SelectedAssetAmountInputProps): ConnectedState => ({
    value: state.selectedAssetAmount,
    assetData: state.selectedAssetData,
});

const updateBuyQuoteAsync = async (
    dispatch: Dispatch<Action>,
    assetData: string,
    assetAmount: BigNumber,
): Promise<void> => {
    // get a new buy quote.
    const baseUnitValue = Web3Wrapper.toBaseUnitAmount(assetAmount, zrxDecimals);

    // mark quote as pending
    dispatch(actions.setQuoteRequestStatePending());

    let newBuyQuote: BuyQuote | undefined;
    try {
        newBuyQuote = await assetBuyer.getBuyQuoteAsync(assetData, baseUnitValue);
    } catch (error) {
        dispatch(actions.setQuoteRequestStateFailure());
        errorUtil.errorFlasher.flashNewError(dispatch, error);
        return;
    }
    // We have a successful new buy quote
    errorUtil.errorFlasher.clearError(dispatch);
    // invalidate the last buy quote.
    dispatch(actions.updateLatestBuyQuote(newBuyQuote));
};

const debouncedUpdateBuyQuoteAsync = _.debounce(updateBuyQuoteAsync, 200, { trailing: true });

const mapDispatchToProps = (
    dispatch: Dispatch<Action>,
    _ownProps: SelectedAssetAmountInputProps,
): ConnectedDispatch => ({
    onChange: (value, assetData) => {
        // Update the input
        dispatch(actions.updateSelectedAssetAmount(value));
        // invalidate the last buy quote.
        dispatch(actions.updateLatestBuyQuote(undefined));
        // reset our buy state
        dispatch(actions.updateBuyOrderState(AsyncProcessState.NONE));

        if (!_.isUndefined(value) && !_.isUndefined(assetData)) {
            // even if it's debounced, give them the illusion it's loading
            dispatch(actions.setQuoteRequestStatePending());
            // tslint:disable-next-line:no-floating-promises
            debouncedUpdateBuyQuoteAsync(dispatch, assetData, value);
        }
    },
});

export const SelectedAssetAmountInput: React.ComponentClass<SelectedAssetAmountInputProps> = connect(
    mapStateToProps,
    mapDispatchToProps,
)(AssetAmountInput);

import type { Blockchain } from "@coral-xyz/common";
import type { Wallet, PublicKey } from "~types/types";

import { Suspense, useCallback } from "react";
import { FlatList, Pressable, View } from "react-native";

import { gql, useSuspenseQuery_experimental } from "@apollo/client";
import { formatUSD } from "@coral-xyz/common";
import {
  useTheme as useTamaguiTheme,
  Box,
  StyledText,
  Stack,
  XStack,
  BlockchainLogo,
} from "@coral-xyz/tamagui";
import { useNavigation } from "@react-navigation/native";
import { ErrorBoundary } from "react-error-boundary";

import { ListHeader, ListItemWalletOverview } from "~components/ListItem";
import {
  RoundedContainerGroup,
  Screen,
  ScreenError,
  ScreenLoading,
} from "~components/index";
import { useWallets } from "~hooks/wallets";
import { BalanceSummaryWidget } from "~screens/Unlocked/components/BalanceSummaryWidget";

// TOOD(peter) GET_WALLET_DATA + ListItemData is a hack until we have aggregate wallets
const GET_WALLET_DATA = gql`
  query WalletData($chainId: ChainID!, $address: String!) {
    wallet(chainId: $chainId, address: $address) {
      id
      balances {
        id
        aggregate {
          id
          percentChange
          value
          valueChange
        }
      }
    }
  }
`;

function ListItemWalletCard({
  isFirst,
  name,
  balance,
  publicKey,
  type,
  blockchain,
  onPress,
}: {
  isFirst: boolean;
  name: string;
  type: string;
  blockchain: Blockchain;
  publicKey: PublicKey;
  balance: string;
  onPress: (w: { blockchain: Blockchain; publicKey: PublicKey }) => void;
}) {
  const dehydrated = type === "dehydrated";
  return (
    <Pressable
      onPress={() => {
        if (!dehydrated) {
          onPress?.({ blockchain, publicKey });
        }
      }}
    >
      <XStack
        mt={isFirst ? 0 : -12}
        jc="space-between"
        p={16}
        borderTopEndRadius={12}
        borderTopStartRadius={12}
        borderWidth={1}
        borderColor="$baseBorderLight"
        backgroundColor="$card"
        height={70}
      >
        <XStack ai="center" space={4}>
          <BlockchainLogo blockchain={blockchain} size={18} />
          <StyledText size="$lg" fontWeight="600">
            {name}
          </StyledText>
        </XStack>
        <StyledText size="$lg">{balance}</StyledText>
      </XStack>
    </Pressable>
  );
}

function ListItemData({
  isFirst,
  wallet,
  onPress,
}: {
  wallet: Wallet;
}): JSX.Element {
  // TODO(peter/graphql): this request needs to fetch all of the balances
  const { data } = useSuspenseQuery_experimental(GET_WALLET_DATA, {
    variables: {
      chainId: wallet.blockchain.toUpperCase(),
      address: wallet.publicKey,
    },
  });

  const balance = data.wallet.balances?.aggregate.value?.toFixed(2) ?? "0.00";

  return (
    <ListItemWalletCard
      isFirst={isFirst}
      name={wallet.name}
      blockchain={wallet.blockchain}
      publicKey={wallet.publicKey}
      type={wallet.type}
      balance={formatUSD(balance)}
      onPress={onPress}
    />
  );
}

function ListItem({
  isFirst,
  item: wallet,
  onPress,
}: {
  isFirst: boolean;
  item: Wallet;
  onPress: any;
}): JSX.Element {
  const ErrorMessage = ({ error }) => {
    return (
      <StyledText color="$redText" size="$sm" textAlign="center">
        {error.message}
      </StyledText>
    );
  };
  return (
    <ErrorBoundary
      fallbackRender={({ error }) => <ErrorMessage error={error} />}
    >
      <Suspense>
        <ListItemData isFirst={isFirst} wallet={wallet} onPress={onPress} />
      </Suspense>
    </ErrorBoundary>
  );
}

function WalletList() {
  const navigation = useNavigation();
  const { allWallets, selectActiveWallet } = useWallets();

  const handlePressWallet = useCallback(
    async (w: Wallet) => {
      selectActiveWallet({ blockchain: w.blockchain, publicKey: w.publicKey });
      navigation.push("TopTabsWalletDetail", {
        screen: "TokenList",
        params: {
          publicKey: w.publicKey.toString(),
          blockchain: w.blockchain,
        },
      });
    },
    [navigation, selectActiveWallet]
  );

  const keyExtractor = (wallet: Wallet) => wallet.publicKey.toString();
  const renderItem = useCallback(
    ({ item: wallet, index }: { item: Wallet; index: number }) => {
      const isFirst = index === 0;
      const isLast = index === allWallets.length - 1;
      return (
        <ListItem isFirst={isFirst} item={wallet} onPress={handlePressWallet} />
      );
    },
    [handlePressWallet, allWallets.length]
  );

  return (
    <FlatList
      style={{ flex: 1 }}
      data={allWallets}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
    />
  );
}

function Container() {
  return (
    <Screen>
      <Box my={12}>
        <BalanceSummaryWidget />
      </Box>
      <WalletList />
    </Screen>
  );
}

export function HomeWalletListScreen(): JSX.Element {
  return (
    <ErrorBoundary
      fallbackRender={({ error }) => <ScreenError error={error.message} />}
    >
      <Suspense fallback={<ScreenLoading />}>
        <Container />
      </Suspense>
    </ErrorBoundary>
  );
}

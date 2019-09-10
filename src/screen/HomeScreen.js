import React, { Component } from 'react'
import { Animated, AppState, Easing, FlatList, Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import {
  withTheme,
  ActivityIndicator,
  Appbar,
  Button,
  Card,
  Chip,
  Dialog,
  FAB,
  List,
  Portal,
  Snackbar,
  TouchableRipple,
  Subheading,
  Paragraph
} from 'react-native-paper'
import auth from '@react-native-firebase/auth'
import { inject, observer } from 'mobx-react'
import moment from 'moment'

import { isNotRunning } from '../config'
import { signIn } from '../hooks/SignIn'
import i18n from '../locales/i18n'

const styles = StyleSheet.create({
  cardLastEntry: {
    margin: 8
  },
  fab: {
    margin: 16,
    alignSelf: 'center'
  },
  absFab: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 20
  },
  list: {
    flex: 1,
    borderBottomWidth: 1
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  chipMargins: {
    marginRight: 8,
    marginTop: 8
  },
  chipText: {
    fontSize: 13
  },
  containerDialog: {
    maxHeight: '75%'
  },
  popupButtonsContainer: {
    flexDirection: 'row',
    minHeight: 30,
    justifyContent: 'space-between',
    marginHorizontal: 20
  }
})

/**
 * This class is the Home Screen.
 * It contains the last entry on top and a FlatList of events grouped by day. One can create an entry by clicking on the + button at the bottom.
 *
 * @author Matthieu BACHELIER
 * @since 2019-02
 * @version 2.0
 */
@inject('dataStore')
@observer
class HomeScreen extends Component {
  static navigationOptions = {
    header: null
  }

  constructor(props) {
    super(props)
    this.state = {
      fetching: true,
      groupedRecords: [],
      appState: AppState.currentState,
      currentGroup: null,
      editGroupDialog: false,
      editLastEntry: false,
      opacity: new Animated.Value(1),
      showSnackbar: false,
      snackBarMessage: ''
    }
    this.autoRefresh = null
  }

  async componentDidMount() {
    AppState.addEventListener('change', this.refreshLastEntry)
    if (!isNotRunning(dataStore.timers)) {
      this.createAnimation()
    }

    this.autoRefresh = setInterval(() => {
      this.forceUpdate()
    }, 1000 * 60)

    if (auth().currentUser && auth().currentUser.photoURL) {
      this.props.navigation.setParams({ userPhoto: auth().currentUser.photoURL })
    }
    const { params } = this.props.navigation.state
    // Used when one has successfully linked his account from another one by using a code
    if (params && params.accountLinked) {
      this.setState({ showSnackbar: true, snackBarMessage: i18n.t('home.accountLinked') })
    }
    await dataStore.fetchCloudData()
    const groupedRecords = dataStore.groupedRecords
    this.setState({ fetching: false, groupedRecords })
  }

  componentWillUnmount() {
    AppState.removeEventListener('change', this.refreshLastEntry)
    clearInterval(this.autoRefresh)
  }

  createAnimation = () =>
    Animated.loop(
      Animated.sequence([
        Animated.timing(this.state.opacity, {
          toValue: 0.05,
          duration: 2000,
          ease: Easing.ease,
          useNativeDriver: true
        }),
        Animated.timing(this.state.opacity, {
          toValue: 1,
          duration: 2000,
          ease: Easing.ease,
          useNativeDriver: true
        })
      ])
    ).start()

  refreshLastEntry = nextAppState => {
    if (this.state.appState.match(/inactive|background/) && nextAppState === 'active') {
      dataStore.groupedRecords
    }
    this.setState({ appState: nextAppState })
  }

  hideDialog = dialog => () => this.setState({ [dialog]: false })

  editGroup = item => {
    this.setState({ currentGroup: { ...item }, editGroupDialog: true })
  }

  ///

  renderChip = (timerId, time) =>
    time > 0 && (
      <Chip style={styles.chipMargins}>
        <Text style={styles.chipText}>{i18n.t(timerId) + ' ' + i18n.getMinAndSeconds(time)}</Text>
      </Chip>
    )

  renderLastEntry(groups) {
    const lastGroup = groups[0]
    const lastEntry = lastGroup.group[0]
    const date = moment.unix(lastEntry.date).format(i18n.uses24HourClock ? 'HH:mm' : 'hh:mm A')
    return (
      <Card style={styles.cardLastEntry} onPress={() => this.setState({ editLastEntry: true })}>
        <Card.Title title={i18n.t('home.lastEntry', { date })} subtitle={i18n.humanize(lastEntry.date)} />
        <Card.Content style={styles.rowWrap}>
          {this.renderChip('left', lastEntry.timers['left'])}
          {this.renderChip('right', lastEntry.timers['right'])}
          {this.renderChip('bottle', lastEntry.timers['bottle'])}
          {lastEntry.bottle > 0 && (
            <Chip style={styles.chipMargins}>
              <Text style={styles.chipText}>{`${i18n.t('bottle')} ${lastEntry.bottle}mL`}</Text>
            </Chip>
          )}
          {lastEntry.vitaminD && (
            <Chip style={styles.chipMargins} icon="brightness-5">
              <Text style={styles.chipText}>{i18n.t('vitaminD')}</Text>
            </Chip>
          )}
        </Card.Content>
      </Card>
    )
  }

  renderItem = ({ item }) => {
    const { colors, palette } = this.props.theme
    return (
      <TouchableRipple
        style={{ borderBottomColor: palette.separator, ...styles.list }}
        onPress={() => this.editGroup(item)}
        rippleColor={palette.rippleColor}
      >
        <List.Section title={i18n.formatLongDay(item.day)}>
          <List.Item
            title={i18n.formatItem(item.group.length)}
            left={() => <List.Icon icon="edit" color={colors.text} style={{ opacity: 0.75 }} />}
            right={() => item.hasVitaminD && <List.Icon color={colors.text} style={{ opacity: 0.5 }} icon="brightness-5" />}
          />
        </List.Section>
      </TouchableRipple>
    )
  }

  /// Dialogs

  editGroupDialog = () => {
    const { colors, palette } = this.props.theme
    let { currentGroup } = this.state
    if (!currentGroup) {
      return false
    }
    let data
    if (currentGroup.group.length === 0) {
      data = <List.Item title={i18n.t('home.groupedEntries.noData')} />
    } else {
      data = currentGroup.group.map((entry, index) => {
        let description = []
        if (entry.timers['left'] > 0) {
          description.push(i18n.t('left') + `:  ${i18n.getMin(entry.timers['left'])}`)
        }
        if (entry.timers['right'] > 0) {
          description.push(i18n.t('right') + `: ${i18n.getMin(entry.timers['right'])}`)
        }
        if (entry.timers['bottle'] > 0) {
          description.push(i18n.t('bottle') + `: ${i18n.getMin(entry.timers['bottle'])}`)
        }
        if (entry.bottle > 0) {
          description.push(i18n.t('bottle') + `: ${entry.bottle}mL`)
        }
        return (
          <List.Item
            key={index}
            title={i18n.formatTime(entry.date)}
            description={description.join(', ')}
            right={() => (
              <TouchableRipple
                onPress={() => {
                  currentGroup.group = [...currentGroup.group.filter(item => item.date !== entry.date)]
                  this.setState({ currentGroup })
                }}
              >
                <List.Icon color={colors.text} icon="delete" />
              </TouchableRipple>
            )}
          />
        )
      })
    }
    return (
      <Portal>
        <Dialog visible={this.state.editGroupDialog} onDismiss={this.hideDialog('editGroupDialog')}>
          <Dialog.Title>{moment.unix(currentGroup.day).format('dddd')}</Dialog.Title>
          <Dialog.ScrollArea style={styles.containerDialog}>
            <ScrollView>{data}</ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions style={styles.popupButtonsContainer}>
            <Button color={palette.buttonColor} onPress={this.hideDialog('editGroupDialog')}>
              {i18n.t('cancel')}
            </Button>
            <Button
              color={palette.buttonColor}
              onPress={async () => {
                await dataStore.updateGroup(currentGroup)
                this.setState({ editGroupDialog: false, groupedRecords: dataStore.groupedRecords })
              }}
            >
              {i18n.t('ok')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    )
  }

  renderFab = isStopped => {
    const { colors } = this.props.theme
    if (isStopped) {
      return (
        <View style={styles.absFab}>
          <FAB
            style={[styles.fab, { backgroundColor: colors.primary }]}
            icon={'add'}
            onPress={() =>
              this.props.navigation.navigate('AddEntry', {
                autoRefresh: () => {
                  this.createAnimation()
                  this.forceUpdate()
                }
              })
            }
          />
        </View>
      )
    } else {
      return (
        <Animated.View style={styles.absFab}>
          <FAB
            style={[styles.fab, { opacity: this.state.opacity, backgroundColor: colors.primary }]}
            icon={'timer'}
            onPress={() => this.props.navigation.navigate('AddEntry')}
          />
        </Animated.View>
      )
    }
  }

  renderProfileIcon = () => {
    if (auth().currentUser && !auth().currentUser.isAnonymous) {
      //console.log('auth().currentUser 1', auth().currentUser)
      return (
        <Appbar.Action
          icon={() => (
            <Image
              style={{ width: 32, height: 32, backgroundColor: this.props.theme.colors.primaryDarkColor, borderRadius: 16 }}
              source={{ uri: auth().currentUser.photoURL }}
            />
          )}
          onPress={() => {
            //console.log('already signed in 2')
          }}
        />
      )
    } else {
      //console.log('auth().currentUser 2', auth().currentUser)
      return (
        <Appbar.Action
          icon="account-circle"
          onPress={() => signIn(name => this.setState({ showSnackbar: true, snackBarMessage: i18n.t('home.greeting', { name }) }))}
        />
      )
    }
  }

  renderEntries = () => {
    const { groupedRecords, fetching } = this.state
    if (fetching) {
      return <ActivityIndicator color={this.props.theme.colors.primary} />
    } else {
      if (groupedRecords.length > 0) {
        return (
          <>
            {this.renderLastEntry(groupedRecords)}
            <FlatList
              data={groupedRecords}
              extraData={groupedRecords}
              extractData={groupedRecords.length}
              keyExtractor={item => `${item.key}`}
              renderItem={this.renderItem}
            />
          </>
        )
      } else {
        return (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Subheading>{i18n.t('home.noEntry')}</Subheading>
            <Paragraph>{i18n.t('home.add')}</Paragraph>
          </View>
        )
      }
    }
  }

  render = () => {
    const { colors } = this.props.theme
    const { showSnackbar, snackBarMessage } = this.state
    return (
      <View style={{ backgroundColor: colors.background, flex: 1 }}>
        <Appbar.Header>
          <Appbar.Action icon="menu" onPress={() => this.props.navigation.toggleDrawer()} />
          <Appbar.Content title={i18n.t('navigation.home')} />
          {this.renderProfileIcon()}
        </Appbar.Header>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          {this.renderEntries()}
          {this.renderFab(isNotRunning(dataStore.timers))}
          {this.editGroupDialog()}
          <Snackbar visible={showSnackbar} onDismiss={() => this.setState({ showSnackbar: false })}>
            {snackBarMessage}
          </Snackbar>
        </View>
      </View>
    )
  }
}

export default withTheme(HomeScreen)

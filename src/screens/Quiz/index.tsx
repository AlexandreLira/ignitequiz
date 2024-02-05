import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import Animated, { Easing, Extrapolate, Extrapolation, interpolate, runOnJS, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';

import { styles } from './styles';

import { QUIZ } from '../../data/quiz';
import { historyAdd } from '../../storage/quizHistoryStorage';

import { Loading } from '../../components/Loading';
import { Question } from '../../components/Question';
import { QuizHeader } from '../../components/QuizHeader';
import { ConfirmButton } from '../../components/ConfirmButton';
import { OutlineButton } from '../../components/OutlineButton';
import { ProgressBar } from '../../components/ProgressBar';
import { THEME } from '../../styles/theme';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { OverlayFeedback } from '../../components/OverlayFeedback';

interface Params {
  id: string;
}

type QuizProps = typeof QUIZ[0];

const CARD_INCLINATION = 5
const CARD_SPIK_AREA = (-200)

export function Quiz() {
  const [points, setPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [quiz, setQuiz] = useState<QuizProps>({} as QuizProps);
  const [alternativeSelected, setAlternativeSelected] = useState<null | number>(null);

  const [statusReply, setStatusReply] = useState(0);

  const shake = useSharedValue(0)
  const scrollY = useSharedValue(0)
  const cardPosition = useSharedValue(0)

  const { navigate } = useNavigation();

  const route = useRoute();
  const { id } = route.params as Params;

  function handleSkipConfirm() {
    Alert.alert('Pular', 'Deseja realmente pular a questão?', [
      { text: 'Não', onPress: () => { } },
      { text: 'Sim', onPress: () => handleNextQuestion() }
    ]);
  }

  async function handleFinished() {
    await historyAdd({
      id: new Date().getTime().toString(),
      title: quiz.title,
      level: quiz.level,
      points,
      questions: quiz.questions.length
    });

    navigate('finish', {
      points: String(points),
      total: String(quiz.questions.length),
    });
  }

  function handleNextQuestion() {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(prevState => prevState + 1)
    } else {
      handleFinished();
    }
  }

  async function handleConfirm() {
    if (alternativeSelected === null) {
      return handleSkipConfirm();
    }

    if (quiz.questions[currentQuestion].correct === alternativeSelected) {
      setStatusReply(1)
      setPoints(prevState => prevState + 1);
    } else {
      setStatusReply(2)
      shakeAnimation()
    }

    setAlternativeSelected(null);
  }

  function handleStop() {
    Alert.alert('Parar', 'Deseja parar agora?', [
      {
        text: 'Não',
        style: 'cancel',
        onPress: () => cardPosition.value = withSpring(0)
      },
      {
        text: 'Sim',
        style: 'destructive',
        onPress: () => navigate('home')
      },
    ]);

    return true;
  }

  function shakeAnimation() {
    shake.value = withSequence(
      withTiming(3, { easing: Easing.bounce }),
      withTiming(0)
    )
  }

  const shakeStyleAnimated = useAnimatedStyle(() => ({
    transform: [{
      translateX: interpolate(
        shake.value,
        [0, 1.5, 3],
        [0, -15, 15]

      )
    }]
  }))

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    }
  })

  const fixedProgressBarStyles = useAnimatedStyle(() => {
    return {
      width: "100%",
      position: "absolute",
      paddingTop: 50,
      backgroundColor: THEME.COLORS.GREY_500,
      opacity: interpolate(scrollY.value, [50, 90], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(scrollY.value, [50, 100], [-40, 1], Extrapolation.CLAMP) }
      ],
      zIndex: 1
    }
  })
  const headerStyles = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [60, 90], [1, 0], Extrapolation.CLAMP),
      width: "100%",
      marginBottom: 21
    }
  })
  const dragStyles = useAnimatedStyle(() => {
    const rotateZ = cardPosition.value / CARD_INCLINATION

    return {
      transform: [
        { translateX: cardPosition.value },
        { rotateZ: `${rotateZ}deg` }
      ],
      opacity: interpolate(cardPosition.value, [0, -300], [1, 0])
    }
  })

  const onPan = Gesture
    .Pan()
    .activateAfterLongPress(200)
    .onUpdate(event => {
      const moveToLeft = event.translationX < 0
      if (moveToLeft) {
        cardPosition.value = event.translationX
      }
    })
    .onEnd(event => {
      if (event.translationX < CARD_SPIK_AREA) {
        runOnJS(handleSkipConfirm)()
      }

      cardPosition.value = withSpring(0)

    })

  useEffect(() => {
    const quizSelected = QUIZ.filter(item => item.id === id)[0];
    setQuiz(quizSelected);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (quiz.questions) {
      handleNextQuestion();
    }
  }, [points]);

  if (isLoading) {
    return <Loading />
  }

  return (
    <View style={styles.container}>
      <OverlayFeedback
        status={statusReply}
      />
      <Animated.View style={fixedProgressBarStyles}>
        <Text style={styles.title}>{quiz.title}</Text>
        <ProgressBar
          total={quiz.questions.length}
          current={currentQuestion + 1}
        />
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.question}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >

        <Animated.View style={headerStyles}>
          <QuizHeader
            title={quiz.title}
            currentQuestion={currentQuestion + 1}
            totalOfQuestions={quiz.questions.length}
          />
        </Animated.View>

        <GestureDetector gesture={onPan}>
          <Animated.View style={[shakeStyleAnimated, dragStyles]}>
           
            <Question
              key={quiz.questions[currentQuestion].title}
              question={quiz.questions[currentQuestion]}
              alternativeSelected={alternativeSelected}
              setAlternativeSelected={setAlternativeSelected}
            />
          </Animated.View>
        </GestureDetector>

        <View style={styles.footer}>
          <OutlineButton title="Parar" onPress={handleStop} />
          <ConfirmButton onPress={handleConfirm} />
        </View>
      </Animated.ScrollView>
    </View >
  );
}
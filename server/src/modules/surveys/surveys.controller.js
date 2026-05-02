const prisma = require('../../config/database');

exports.list = async (req, res, next) => {
  try {
    const surveys = await prisma.survey.findMany({
      include: {
        area: { select: { id: true, name: true } },
        _count: { select: { responses: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(surveys);
  } catch (e) { next(e); }
};

exports.getOne = async (req, res, next) => {
  try {
    const survey = await prisma.survey.findUnique({
      where: { id: req.params.id },
      include: { area: true, _count: { select: { responses: true } } },
    });
    if (!survey) return res.status(404).json({ error: 'Survey not found' });
    res.json(survey);
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const { title, description, areaId, questions } = req.body;
    const survey = await prisma.survey.create({ data: { title, description, areaId, questions } });
    res.status(201).json(survey);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const { title, description, status, questions, areaId } = req.body;
    const survey = await prisma.survey.update({
      where: { id: req.params.id },
      data: { title, description, status, questions, areaId },
    });
    res.json(survey);
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    await prisma.survey.delete({ where: { id: req.params.id } });
    res.json({ message: 'Survey deleted' });
  } catch (e) { next(e); }
};

exports.getPublic = async (req, res, next) => {
  try {
    const survey = await prisma.survey.findUnique({
      where: { accessToken: req.params.token },
      select: { id: true, title: true, description: true, questions: true, status: true },
    });
    if (!survey || survey.status !== 'ACTIVE') return res.status(404).json({ error: 'Survey not available' });
    res.json(survey);
  } catch (e) { next(e); }
};

exports.submitPublic = async (req, res, next) => {
  try {
    const survey = await prisma.survey.findUnique({ where: { accessToken: req.params.token } });
    if (!survey || survey.status !== 'ACTIVE') return res.status(404).json({ error: 'Survey not available' });
    const response = await prisma.surveyResponse.create({
      data: { surveyId: survey.id, answers: req.body.answers, metadata: req.body.metadata },
    });
    res.status(201).json({ message: 'Response submitted', id: response.id });
  } catch (e) { next(e); }
};

exports.getResponses = async (req, res, next) => {
  try {
    const responses = await prisma.surveyResponse.findMany({
      where: { surveyId: req.params.id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(responses);
  } catch (e) { next(e); }
};

exports.getAnalytics = async (req, res, next) => {
  try {
    const survey = await prisma.survey.findUnique({ where: { id: req.params.id } });
    const responses = await prisma.surveyResponse.findMany({ where: { surveyId: req.params.id } });
    const questions = survey.questions;
    const analytics = questions.map((q) => {
      if (q.type === 'multiple_choice' || q.type === 'single_choice') {
        const counts = {};
        responses.forEach((r) => {
          const ans = r.answers[q.id];
          const vals = Array.isArray(ans) ? ans : [ans];
          vals.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
        });
        const total = responses.length;
        return {
          questionId: q.id,
          question: q.text,
          type: q.type,
          counts,
          percentages: Object.fromEntries(
            Object.entries(counts).map(([k, v]) => [k, total ? Math.round((v / total) * 100) : 0])
          ),
          totalResponses: total,
        };
      }
      return { questionId: q.id, question: q.text, type: q.type, totalResponses: responses.length };
    });
    res.json({ totalResponses: responses.length, analytics });
  } catch (e) { next(e); }
};

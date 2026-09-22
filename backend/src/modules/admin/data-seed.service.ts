import { Injectable, Logger } from '@nestjs/common'
import { SupabaseService } from '../../core/database/supabase.service'
import { RegistrationsService } from '../registrations/registrations.service'
import * as fs from 'fs'
import * as path from 'path'

@Injectable()
export class DataSeedService {
  private readonly logger = new Logger(DataSeedService.name)

  constructor(
    private readonly supabase: SupabaseService,
    private readonly registrationsService: RegistrationsService,
  ) {}

  async seedCoursesAndBlueprints(force = false) {
    try {
      const { count: existingCourses } = await this.supabase.admin
        .from('courses')
        .select('*', { count: 'exact', head: true })

      const { count: existingBlueprints } = await this.supabase.admin
        .from('semester_blueprints')
        .select('*', { count: 'exact', head: true })

      if (!force && existingCourses && existingCourses >= 64 && existingBlueprints && existingBlueprints >= 13) {
        this.logger.log(
          `Database already seeded with ${existingCourses} courses and ${existingBlueprints} blueprints. Skipping re-upsert.`,
        )
        return
      }
      const coursesData = [
        {
          id: '04a5225c-2e65-4a1c-90c2-9a888dd3f8e8',
          course_code: 'KU01MDCPSY101',
          title: 'Psychology of Everyday Life',
          department_id: '9cfa61d3-ed11-4d78-9001-54c76035fbcb',
          semester: 1,
          credits: 3,
          category: 'MDC',
          tag: 'MDC-1',
          theory_hours_per_week: 2,
          practical_hours_per_week: 1,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: '15e82757-6541-42ab-bf6c-8bc6d48d0ba9',
          course_code: 'KU03DSCECO201',
          title: 'Introduction to Micro Economics',
          department_id: '7898c34b-e8bf-4acc-be44-9b42d185e605',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 4,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: '170ff803-3ffd-4312-96a4-2fbed41ed28f',
          course_code: 'KU01MDCCSE101',
          title: 'Foundations of Information and Communication Technologies',
          department_id: '96a54058-8437-46a3-9815-ae49deab0999',
          semester: 1,
          credits: 3,
          category: 'MDC',
          tag: 'MDC-1',
          theory_hours_per_week: 2,
          practical_hours_per_week: 2,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: '174e18f8-1056-467f-806c-7b0aaa5dc7f1',
          course_code: 'KU03DSCPSY201',
          title: 'History and Perspectives of Psychological Science',
          department_id: '9cfa61d3-ed11-4d78-9001-54c76035fbcb',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 2,
          practical_hours_per_week: 1,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: '1ddc28ff-0c59-4044-ba42-0b58a7c06b13',
          course_code: 'KU01DSCSTA101',
          title: 'Descriptive Statistics',
          department_id: 'f2f08c07-581a-434c-89c5-83ae47030a0e',
          semester: 1,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 3,
          practical_hours_per_week: 2,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: '258d1fa9-b118-4ff0-a318-b3355f29c873',
          course_code: 'KU01DSCEVS101',
          title: 'Fundamentals of Environmental Science',
          department_id: 'b68264cf-6b23-409f-b4bd-0617e37ebb15',
          semester: 1,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 2,
          practical_hours_per_week: 1,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: '29159311-ece9-4b9b-ba1e-fd9a079f01c8',
          course_code: 'KU03MDCSTA202',
          title: 'Applied Statistical Inference',
          department_id: 'f2f08c07-581a-434c-89c5-83ae47030a0e',
          semester: 3,
          credits: 3,
          category: 'MDC',
          tag: 'MDC-3',
          theory_hours_per_week: 2,
          practical_hours_per_week: 2,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: '2d59b642-c058-4b90-ae75-d8d8773a684d',
          course_code: 'KU01MDCSTA101',
          title: 'Basic Statistics',
          department_id: 'f2f08c07-581a-434c-89c5-83ae47030a0e',
          semester: 1,
          credits: 3,
          category: 'MDC',
          tag: 'MDC-1',
          theory_hours_per_week: 2,
          practical_hours_per_week: 2,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: '35c67958-5284-45a6-9fbe-5d8c28ed6c79',
          course_code: 'KU01DSCMAT101',
          title: 'Logic And Set Theory',
          department_id: 'a8a70f5e-3130-4a2a-8329-4e4365d683b5',
          semester: 1,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 4,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: '39ddae34-015e-4931-bc1d-fcb4cc870bbe',
          course_code: 'KU03MDCECO202',
          title: 'Nutrition Economics',
          department_id: '7898c34b-e8bf-4acc-be44-9b42d185e605',
          semester: 3,
          credits: 3,
          category: 'MDC',
          tag: 'MDC-3',
          theory_hours_per_week: 3,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: '3a21c5cc-fc1c-4cb7-9d19-475ff060bd8a',
          course_code: 'KU03DSCEVS204',
          title: 'Practical in Ecology',
          department_id: 'b68264cf-6b23-409f-b4bd-0617e37ebb15',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 2,
          practical_hours_per_week: 1,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: '3fa747bb-8bba-4208-b43e-df2f82c3b034',
          course_code: 'KU01DSCECO101',
          title: 'Introduction to Economics',
          department_id: '7898c34b-e8bf-4acc-be44-9b42d185e605',
          semester: 1,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 4,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: '44c92bf6-d7ba-42cd-a27f-2c68f24ac48e',
          course_code: 'KU01AECENG102',
          title: 'English For Business Communication',
          department_id: '35984692-74e0-4772-a01e-fae2622ff773',
          semester: 1,
          credits: 3,
          category: 'AEC',
          tag: 'AEC-2',
          theory_hours_per_week: 3,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: '4edc2e73-4e8f-47e5-9554-c63f8703752a',
          course_code: 'KU03DSCPSY202',
          title: 'Personality: Approaches and Contemporary Application',
          department_id: '9cfa61d3-ed11-4d78-9001-54c76035fbcb',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 2,
          practical_hours_per_week: 1,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: '4f87ff1a-c21e-4adb-b17c-05b380e173c6',
          course_code: 'KU03DSCMAT204',
          title: 'Numerical Analysis',
          department_id: 'a8a70f5e-3130-4a2a-8329-4e4365d683b5',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 4,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: '4fc7d940-9ff9-4588-a1c2-73a3b0ca98f2',
          course_code: 'KU01MDCECO102',
          title: 'Health Economics',
          department_id: '7898c34b-e8bf-4acc-be44-9b42d185e605',
          semester: 1,
          credits: 3,
          category: 'MDC',
          tag: 'MDC-1',
          theory_hours_per_week: 3,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: '51002dd3-bf9e-474b-b168-79beb5719c80',
          course_code: 'KU03DSCCSE201',
          title: 'Introduction to Data Structure',
          department_id: '96a54058-8437-46a3-9815-ae49deab0999',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 2,
          practical_hours_per_week: 4,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: '5dcb9e70-2cd0-4b56-95b4-98faec051a8a',
          course_code: 'KU02MDCMAT101',
          title: 'Elementary Mathematics -2',
          department_id: 'a8a70f5e-3130-4a2a-8329-4e4365d683b5',
          semester: 1,
          credits: 3,
          category: 'MDC',
          tag: 'MDC-1',
          theory_hours_per_week: 3,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: '61098a8f-e12f-4783-a89b-0942df4df30d',
          course_code: 'KU01DSCCSE101',
          title: 'Principles of Programming',
          department_id: '96a54058-8437-46a3-9815-ae49deab0999',
          semester: 1,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 2,
          practical_hours_per_week: 4,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: '639d1054-5f14-44d5-9669-be59dac81f94',
          course_code: 'KU03DSCSTA203',
          title: 'Matrix Theory',
          department_id: 'f2f08c07-581a-434c-89c5-83ae47030a0e',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 3,
          practical_hours_per_week: 2,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: '65c229d8-6915-4eba-a67a-953d5cc8b106',
          course_code: 'KU03DSCSTA201',
          title: 'Theory of Random Variables',
          department_id: 'f2f08c07-581a-434c-89c5-83ae47030a0e',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 3,
          practical_hours_per_week: 2,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: '686185ec-5fa6-4493-a7bd-8237cfd99416',
          course_code: 'KU03MDCECO203',
          title: 'Optimisation Techniques',
          department_id: '7898c34b-e8bf-4acc-be44-9b42d185e605',
          semester: 3,
          credits: 3,
          category: 'MDC',
          tag: 'MDC-3',
          theory_hours_per_week: 3,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: '69911223-63c7-4ede-8e2c-71998ca01161',
          course_code: 'KU01MDCECO103',
          title: 'Economics of Natural Resources',
          department_id: '7898c34b-e8bf-4acc-be44-9b42d185e605',
          semester: 1,
          credits: 3,
          category: 'MDC',
          tag: 'MDC-1',
          theory_hours_per_week: 3,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: '6b42afec-8119-4374-8c5d-699a53ebba87',
          course_code: 'KU03MDCPSY201',
          title: 'Psychology of Gender and Sexuality',
          department_id: '9cfa61d3-ed11-4d78-9001-54c76035fbcb',
          semester: 3,
          credits: 3,
          category: 'MDC',
          tag: 'MDC-3',
          theory_hours_per_week: 2,
          practical_hours_per_week: 1,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: '70aac1b4-a359-470e-8efd-ab944ac15cd0',
          course_code: 'KU03DSCPES203',
          title: 'Health Science Education',
          department_id: '71ba995f-fa2d-461b-8971-73c4fd00dac7',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 4,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: '71c381ce-fb7f-41e0-8ad0-7d0d74fa2810',
          course_code: 'KU01MDCECO101',
          title: 'Economics of Tourism and Development',
          department_id: '7898c34b-e8bf-4acc-be44-9b42d185e605',
          semester: 1,
          credits: 3,
          category: 'MDC',
          tag: 'MDC-1',
          theory_hours_per_week: 3,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: '735dc827-e00e-4de8-899f-3b83f064af9a',
          course_code: 'KU03VACPES101',
          title: 'Yoga For Health',
          department_id: '71ba995f-fa2d-461b-8971-73c4fd00dac7',
          semester: 3,
          credits: 3,
          category: 'VAC',
          tag: 'VAC-3',
          theory_hours_per_week: 2,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: '7cc973dd-e54c-4b3d-969f-cab8e8034e60',
          course_code: 'KU01DSCPSY101',
          title: 'Foundations of Psychology',
          department_id: '9cfa61d3-ed11-4d78-9001-54c76035fbcb',
          semester: 1,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 2,
          practical_hours_per_week: 1,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: '8af07352-c1f1-4eca-9da2-f5cd608a6599',
          course_code: 'KU03DSCSTA202',
          title: 'Distribution Theory-I',
          department_id: 'f2f08c07-581a-434c-89c5-83ae47030a0e',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 3,
          practical_hours_per_week: 2,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: '8dfb1f1a-a3f9-4bdb-96ba-83c53e15ccf7',
          course_code: 'KU03MDCECO201',
          title: 'Kerala Studies',
          department_id: '7898c34b-e8bf-4acc-be44-9b42d185e605',
          semester: 3,
          credits: 3,
          category: 'MDC',
          tag: 'MDC-3',
          theory_hours_per_week: 3,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: '978c321e-ea10-47fb-871a-960c7f969fdb',
          course_code: 'KU01MDCPES101',
          title: 'Foundation Of Physical Education, Exercise Science And Sport',
          department_id: '71ba995f-fa2d-461b-8971-73c4fd00dac7',
          semester: 1,
          credits: 3,
          category: 'MDC',
          tag: 'MDC-1',
          theory_hours_per_week: 3,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'a2040ac0-a977-44df-8426-aaf9669b7cae',
          course_code: 'KU03DSCCSE203',
          title: 'Engineering Physics',
          department_id: '96a54058-8437-46a3-9815-ae49deab0999',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 2,
          practical_hours_per_week: 4,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'a54a5aae-626f-4760-b00b-3eeb3300c8ce',
          course_code: 'KU03DSCECO203',
          title: 'Introduction to Indian Economy',
          department_id: '7898c34b-e8bf-4acc-be44-9b42d185e605',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 4,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'a69ffb3d-5f43-4323-99e7-7cc2dc215104',
          course_code: 'KU03DSCSTA205',
          title: 'Probability Distributions',
          department_id: 'f2f08c07-581a-434c-89c5-83ae47030a0e',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 0,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'aa1c463f-e17d-49b2-a43d-6f244cf8c610',
          course_code: 'KU03DSCECO204',
          title: 'Quantitative Techniques for Data Analysis',
          department_id: '7898c34b-e8bf-4acc-be44-9b42d185e605',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 4,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'abd49d0a-30fe-4e69-bfdc-f0e150a5d5aa',
          course_code: 'KU01DSCPES101',
          title: 'Foundations of Human Anatomy',
          department_id: '71ba995f-fa2d-461b-8971-73c4fd00dac7',
          semester: 1,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 4,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'acef9f7a-be11-4c74-93ee-cb171b74c08a',
          course_code: 'KU03VACECO202',
          title: 'Database on Indian Economy',
          department_id: '7898c34b-e8bf-4acc-be44-9b42d185e605',
          semester: 3,
          credits: 3,
          category: 'VAC',
          tag: 'VAC-3',
          theory_hours_per_week: 3,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'ad36f861-683d-4ab7-a936-21a64bc59ecf',
          course_code: 'KU01DSCWST101',
          title: 'Forestry And Dendrology',
          department_id: '3cabe38e-2fe2-4ff6-9bc6-9f564fa2b8a2',
          semester: 1,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 2,
          practical_hours_per_week: 1,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'b6764f50-1a19-492f-a320-1aa3250ab35b',
          course_code: 'KU03DSCPSY203',
          title: 'Social Psychology',
          department_id: '9cfa61d3-ed11-4d78-9001-54c76035fbcb',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 2,
          practical_hours_per_week: 1,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'c39b0d8e-1000-4704-b785-d3000926c03b',
          course_code: 'KU03VACPSY201',
          title: 'Ethics And Pro Social Behavior',
          department_id: '9cfa61d3-ed11-4d78-9001-54c76035fbcb',
          semester: 3,
          credits: 3,
          category: 'VAC',
          tag: 'VAC-3',
          theory_hours_per_week: 2,
          practical_hours_per_week: 1,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'c97e3a5a-1ee6-474d-bb0e-17198e64151f',
          course_code: 'KU03DSCEVS201',
          title: 'Environmental Geology',
          department_id: 'b68264cf-6b23-409f-b4bd-0617e37ebb15',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 2,
          practical_hours_per_week: 1,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'd28d37bb-51ea-448e-9eee-3a7c610fa48f',
          course_code: 'KU03DSCECO202',
          title: 'Introduction to Macro Economics',
          department_id: '7898c34b-e8bf-4acc-be44-9b42d185e605',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 4,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'd9da9673-d216-40db-9a0b-8f5e4e31d787',
          course_code: 'KU03DSCEVS203',
          title: 'Fundamentals of Environmental Chemistry',
          department_id: 'b68264cf-6b23-409f-b4bd-0617e37ebb15',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 2,
          practical_hours_per_week: 1,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'db57cfe2-c81e-4f7f-a64c-14f22427babb',
          course_code: 'KU03DSCMAT203',
          title: 'Number Theory',
          department_id: 'a8a70f5e-3130-4a2a-8329-4e4365d683b5',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 4,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'e0131617-d886-45e2-b3a5-607aba2ad625',
          course_code: 'KU03DSCCSE202',
          title: 'Object oriented Programming using C++',
          department_id: '96a54058-8437-46a3-9815-ae49deab0999',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 2,
          practical_hours_per_week: 4,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'e465df06-1556-4421-be69-f5216554e492',
          course_code: 'KU01DSCGEO101',
          title: 'Introduction to Dynamic Earth',
          department_id: 'b1870668-6a16-42c0-99fb-71fa2a9179d8',
          semester: 1,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 0,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'e527f30c-ae64-4ea9-843a-66eb61451bfc',
          course_code: 'KU03DSCPES202',
          title: 'Tests, Measurements And Evaluation In Physical Education And Sports',
          department_id: '71ba995f-fa2d-461b-8971-73c4fd00dac7',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 4,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'e5f63cb4-00ae-4b62-825c-b8257c193db6',
          course_code: 'KU01AECENG101',
          title: 'Practical English Language Skills',
          department_id: '35984692-74e0-4772-a01e-fae2622ff773',
          semester: 1,
          credits: 3,
          category: 'AEC',
          tag: 'AEC-1',
          theory_hours_per_week: 3,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'e95c7af9-98e5-4726-bdd7-c4482f59040a',
          course_code: 'KU01MDCMAT101',
          title: 'Elementary Mathematics -1',
          department_id: 'a8a70f5e-3130-4a2a-8329-4e4365d683b5',
          semester: 1,
          credits: 3,
          category: 'MDC',
          tag: 'MDC-1',
          theory_hours_per_week: 3,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'ec9a44d9-7b3d-4081-948c-cee4a68ec573',
          course_code: 'KU03DSCMAT201',
          title: 'Calculus II',
          department_id: 'a8a70f5e-3130-4a2a-8329-4e4365d683b5',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 4,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'ee9fc6d5-26e8-41f6-9235-c15d84aa39ac',
          course_code: 'KU03DSCMAT202',
          title: 'Differential Equations',
          department_id: 'a8a70f5e-3130-4a2a-8329-4e4365d683b5',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 4,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'eeda7161-6af8-48fa-9b0e-68c0698f1bb0',
          course_code: 'KU03DSCSTA204',
          title: 'Statistical Computing Using SPSS',
          department_id: 'f2f08c07-581a-434c-89c5-83ae47030a0e',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 1,
          practical_hours_per_week: 6,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'f8cde6d7-e8ec-4fb0-a2c4-e0a017cf8a8b',
          course_code: 'KU03DSCPES204',
          title: 'Major Game – Kho-Kho/Kabaddi',
          department_id: '71ba995f-fa2d-461b-8971-73c4fd00dac7',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 0,
          practical_hours_per_week: 2,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'f9d7ac58-847a-4bee-a3cb-25cbf46e753a',
          course_code: 'KU03VACECO201',
          title: 'AI in Daily Life',
          department_id: '7898c34b-e8bf-4acc-be44-9b42d185e605',
          semester: 3,
          credits: 3,
          category: 'VAC',
          tag: 'VAC-3',
          theory_hours_per_week: 2,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'fa1f04d2-ea57-4493-95ae-80513f6b5770',
          course_code: 'KU03DSCCSE204',
          title: 'Scientific Computing',
          department_id: '96a54058-8437-46a3-9815-ae49deab0999',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 3,
          practical_hours_per_week: 2,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'faacb2b4-a59e-4427-82bd-7a4c2dacd773',
          course_code: 'KU03DSCEVS202',
          title: 'Biodiversity Conservation',
          department_id: 'b68264cf-6b23-409f-b4bd-0617e37ebb15',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 2,
          practical_hours_per_week: 1,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'fadd3f2f-6650-4f44-94fe-526e2b561ee7',
          course_code: 'KU03DSCPES201',
          title: 'Science Of Human Movement',
          department_id: '71ba995f-fa2d-461b-8971-73c4fd00dac7',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 4,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'feee93d4-36dc-4fbe-b7c7-035141a31775',
          course_code: 'KU03VACPES102',
          title: 'Health & Wellness',
          department_id: '71ba995f-fa2d-461b-8971-73c4fd00dac7',
          semester: 3,
          credits: 3,
          category: 'VAC',
          tag: 'VAC-3',
          theory_hours_per_week: 2,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'ff3d5d95-7443-409e-9705-723ca116f8a6',
          course_code: 'KU03DSCPSY204',
          title: 'Child and Adolescent Psychology',
          department_id: '9cfa61d3-ed11-4d78-9001-54c76035fbcb',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 2,
          practical_hours_per_week: 1,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'ffd4c12c-cf80-4d30-9d11-870f5c8bb848',
          course_code: 'KU03DSCSTA206',
          title: 'Sampling Techniques',
          department_id: 'f2f08c07-581a-434c-89c5-83ae47030a0e',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 0,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'e8140001-e1c2-4731-b2ec-d97d5dc89701',
          course_code: 'KU01DSCHIS101',
          title: 'History of Early India',
          department_id: 'e814d190-e1c2-4731-b2ec-d97d5dc897e0',
          semester: 1,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 4,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'e8140002-e1c2-4731-b2ec-d97d5dc89702',
          course_code: 'KU03DSCHIS201',
          title: 'History of Medieval India',
          department_id: 'e814d190-e1c2-4731-b2ec-d97d5dc897e0',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 4,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'e8140003-e1c2-4731-b2ec-d97d5dc89703',
          course_code: 'KU03DSCHIS202',
          title: 'History of Modern India',
          department_id: 'e814d190-e1c2-4731-b2ec-d97d5dc897e0',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 4,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
        {
          id: 'e8140004-e1c2-4731-b2ec-d97d5dc89704',
          course_code: 'KU03DSCHIS203',
          title: 'Aspects of World History',
          department_id: 'e814d190-e1c2-4731-b2ec-d97d5dc897e0',
          semester: 3,
          credits: 4,
          category: 'DSC',
          tag: null,
          theory_hours_per_week: 4,
          practical_hours_per_week: 0,
          seat_limit: 60,
          prerequisite_course_ids: [],
        },
      ]

      this.logger.log(`Upserting ${coursesData.length} courses...`)
      const { data: insertedCourses, error: coursesError } = await this.supabase.admin
        .from('courses')
        .upsert(coursesData, { onConflict: 'id' })
        .select('id')

      if (coursesError) {
        this.logger.error(`Courses upsert failed: ${JSON.stringify(coursesError)}`)
      } else {
        this.logger.log(`Successfully upserted ${insertedCourses?.length ?? coursesData.length} courses!`)
      }

      const blueprintsData = [
        {
          id: '2231f10e-e9dd-45d7-bc3c-0fc47b82ee80',
          department_id: 'a8a70f5e-3130-4a2a-8329-4e4365d683b5',
          semester: 3,
          min_credits: 22,
          max_credits: 22,
          slot_1_rule: 'DEPT_RESTRICTED',
          slot_1_target: 'MAT,STA',
          slot_2_rule: 'DEPT_RESTRICTED',
          slot_2_target: 'MAT,STA',
          slot_3_rule: 'DEPT_RESTRICTED',
          slot_3_target: 'MAT,STA',
          slot_4_rule: 'DEPT_RESTRICTED',
          slot_4_target: 'STA,MAT',
          slot_5_rule: 'GLOBAL_BASKET',
          slot_5_target: 'MDC-3',
          slot_6_rule: 'GLOBAL_BASKET',
          slot_6_target: 'VAC-3',
          slot_1_name: 'MAJOR 1',
          slot_2_name: 'MAJOR 2',
          slot_3_name: 'MAJOR 3',
          slot_4_name: 'MAJOR 4',
          slot_5_name: 'MDC',
          slot_6_name: 'VAC',
          pathways: [
            {
              id: '6fc5f211-411e-4896-978a-c97d4ce2890c',
              name: 'Default',
              slots: [
                { name: 'MAJOR 1', rule: 'FIXED', target: 'KU03DSCMAT201' },
                { name: 'MAJOR 2', rule: 'FIXED', target: 'KU03DSCMAT202' },
                { name: 'MAJOR 3', rule: 'FIXED', target: 'KU03DSCMAT203' },
                { name: 'MAJOR 4', rule: 'FIXED', target: 'KU03DSCMAT204' },
                { name: 'MDC', rule: 'GLOBAL_BASKET', target: 'MDC-3' },
                { name: 'VAC', rule: 'GLOBAL_BASKET', target: 'VAC-3' },
              ],
            },
          ],
        },
        {
          id: '6a805fcd-9646-4e37-bbb9-27c633979884',
          department_id: 'a8a70f5e-3130-4a2a-8329-4e4365d683b5',
          semester: 1,
          min_credits: 21,
          max_credits: 21,
          slot_1_rule: 'FIXED',
          slot_1_target: 'KU01DSCMAT101',
          slot_2_rule: 'EXCLUDE_DEPT',
          slot_2_target: 'MAT',
          slot_3_rule: 'EXCLUDE_DEPT',
          slot_3_target: 'MAT',
          slot_4_rule: 'GLOBAL_BASKET',
          slot_4_target: 'MDC-1',
          slot_5_rule: 'GLOBAL_BASKET',
          slot_5_target: 'AEC-1',
          slot_6_rule: 'GLOBAL_BASKET',
          slot_6_target: 'AEC-2',
          slot_1_name: 'MAJOR ',
          slot_2_name: 'MINOR 1',
          slot_3_name: 'MINOR 2',
          slot_4_name: 'MDC',
          slot_5_name: 'AEC 1',
          slot_6_name: 'AEC 2',
          pathways: [
            {
              id: '6fc5f211-411e-4896-978a-c97d4ce2890c',
              name: 'Default',
              slots: [
                { name: 'MAJOR ', rule: 'FIXED', target: 'KU01DSCMAT101' },
                { name: 'MINOR 1', rule: 'EXCLUDE_DEPT', target: 'MAT' },
                { name: 'MINOR 2', rule: 'EXCLUDE_DEPT', target: 'MAT' },
                { name: 'MDC', rule: 'GLOBAL_BASKET', target: 'MDC-1' },
                { name: 'AEC 1', rule: 'GLOBAL_BASKET', target: 'AEC-1' },
                { name: 'AEC 2', rule: 'GLOBAL_BASKET', target: 'AEC-2' },
              ],
            },
          ],
        },
        {
          id: '7cbcbbfe-50e0-4ccb-aba1-a7528f71f251',
          department_id: 'b68264cf-6b23-409f-b4bd-0617e37ebb15',
          semester: 1,
          min_credits: 21,
          max_credits: 22,
          slot_1_rule: 'FIXED',
          slot_1_target: 'KU01DSCEVS101',
          slot_2_rule: 'FIXED',
          slot_2_target: 'KU01DSCEVS101',
          slot_3_rule: 'EXCLUDE_DEPT',
          slot_3_target: 'EVS,MAT,STA',
          slot_4_rule: 'EXCLUDE_DEPT',
          slot_4_target: 'EVS,STA,MAT',
          slot_5_rule: 'GLOBAL_BASKET',
          slot_5_target: 'AEC-1',
          slot_6_rule: 'GLOBAL_BASKET',
          slot_6_target: 'AEC-2',
          slot_1_name: 'MAJOR',
          slot_2_name: 'MINOR 1',
          slot_3_name: 'MINOR 2',
          slot_4_name: 'MDC',
          slot_5_name: 'AEC 1',
          slot_6_name: 'AEC 2',
          pathways: [
            {
              id: '6fc5f211-411e-4896-978a-c97d4ce2890c',
              name: 'Default',
              slots: [
                { name: 'MAJOR', rule: 'FIXED', target: 'KU01DSCEVS101' },
                { name: 'MINOR 1', rule: 'EXCLUDE_DEPT', target: 'EVS' },
                { name: 'MINOR 2', rule: 'EXCLUDE_DEPT', target: 'EVS' },
                { name: 'MDC', rule: 'GLOBAL_BASKET', target: 'MDC-1' },
                { name: 'AEC 1', rule: 'GLOBAL_BASKET', target: 'AEC-1' },
                { name: 'AEC 2', rule: 'GLOBAL_BASKET', target: 'AEC-2' },
              ],
            },
          ],
        },
        {
          id: '801a9cfe-65ae-4714-a142-2305f0c5ec62',
          department_id: '96a54058-8437-46a3-9815-ae49deab0999',
          semester: 3,
          min_credits: 22,
          max_credits: 22,
          slot_1_rule: 'FIXED',
          slot_1_target: 'KU03DSCCSE202',
          slot_2_rule: 'FIXED',
          slot_2_target: 'KU03DSCCSE201',
          slot_3_rule: 'FIXED',
          slot_3_target: 'KU03DSCCSE203',
          slot_4_rule: 'EXCLUDE_DEPT',
          slot_4_target: 'IT',
          slot_5_rule: 'GLOBAL_BASKET',
          slot_5_target: 'MDC-3',
          slot_6_rule: 'GLOBAL_BASKET',
          slot_6_target: 'VAC-3',
          slot_1_name: 'MAJOR 1 ',
          slot_2_name: 'MAJOR 2',
          slot_3_name: 'MAJOR 3',
          slot_4_name: 'MINOR 1',
          slot_5_name: 'MDC',
          slot_6_name: 'VAC ',
          pathways: [
            {
              id: '6fc5f211-411e-4896-978a-c97d4ce2890c',
              name: 'Default',
              slots: [
                { name: 'MAJOR 1 ', rule: 'FIXED', target: 'KU03DSCCSE201' },
                { name: 'MAJOR 2', rule: 'FIXED', target: 'KU03DSCCSE202' },
                { name: 'MAJOR 3', rule: 'FIXED', target: 'KU03DSCCSE203' },
                { name: 'MINOR 1', rule: 'EXCLUDE_DEPT', target: 'IT' },
                { name: 'MDC', rule: 'GLOBAL_BASKET', target: 'MDC-3' },
                { name: 'VAC ', rule: 'GLOBAL_BASKET', target: 'VAC-3' },
              ],
            },
          ],
        },
        {
          id: '9782d3c1-52a6-4007-ba73-d6fc5a3c7b39',
          department_id: '7898c34b-e8bf-4acc-be44-9b42d185e605',
          semester: 1,
          min_credits: 21,
          max_credits: 21,
          slot_1_rule: 'FIXED',
          slot_1_target: 'KU01DSCECO101',
          slot_2_rule: 'EXCLUDE_DEPT',
          slot_2_target: 'ECO',
          slot_3_rule: 'EXCLUDE_DEPT',
          slot_3_target: 'ECO',
          slot_4_rule: 'GLOBAL_BASKET',
          slot_4_target: 'MDC-1',
          slot_5_rule: 'GLOBAL_BASKET',
          slot_5_target: 'AEC-1',
          slot_6_rule: 'GLOBAL_BASKET',
          slot_6_target: 'AEC-2',
          slot_1_name: 'MAJOR',
          slot_2_name: 'Minor 1',
          slot_3_name: 'MINOR 2',
          slot_4_name: 'MDC',
          slot_5_name: 'AEC 1',
          slot_6_name: 'AEC 2',
          pathways: [
            {
              id: '6fc5f211-411e-4896-978a-c97d4ce2890c',
              name: 'Default',
              slots: [
                { name: 'MAJOR', rule: 'FIXED', target: 'KU01DSCECO101' },
                { name: 'Minor 1', rule: 'EXCLUDE_DEPT', target: 'ECO' },
                { name: 'MINOR 2', rule: 'EXCLUDE_DEPT', target: 'ECO' },
                { name: 'MDC', rule: 'GLOBAL_BASKET', target: 'MDC-1' },
                { name: 'AEC 1', rule: 'GLOBAL_BASKET', target: 'AEC-1' },
                { name: 'AEC 2', rule: 'GLOBAL_BASKET', target: 'AEC-2' },
              ],
            },
          ],
        },
        {
          id: 'ad9c7582-32eb-4598-af70-187636f31658',
          department_id: 'b68264cf-6b23-409f-b4bd-0617e37ebb15',
          semester: 3,
          min_credits: 22,
          max_credits: 22,
          slot_1_rule: 'FIXED',
          slot_1_target: 'KU03DSCEVS201',
          slot_2_rule: 'FIXED',
          slot_2_target: 'KU03DSCEVS202',
          slot_3_rule: 'FIXED',
          slot_3_target: 'KU03DSCEVS203',
          slot_4_rule: 'EXCLUDE_DEPT',
          slot_4_target: 'EVS',
          slot_5_rule: 'GLOBAL_BASKET',
          slot_5_target: 'MDC-3',
          slot_6_rule: 'GLOBAL_BASKET',
          slot_6_target: 'VAC-3',
          slot_1_name: 'MAJOR 1',
          slot_2_name: 'MAJOR 2',
          slot_3_name: 'MAJOR 3',
          slot_4_name: 'MINOR 1',
          slot_5_name: 'MDC',
          slot_6_name: 'VAC',
          pathways: [
            {
              id: '6fc5f211-411e-4896-978a-c97d4ce2890c',
              name: 'Default',
              slots: [
                { name: 'MAJOR 1', rule: 'FIXED', target: 'KU03DSCEVS201' },
                { name: 'MAJOR 2', rule: 'FIXED', target: 'KU03DSCEVS202' },
                { name: 'MAJOR 3', rule: 'FIXED', target: 'KU03DSCEVS203' },
                { name: 'MINOR 1', rule: 'EXCLUDE_DEPT', target: 'EVS' },
                { name: 'MDC', rule: 'GLOBAL_BASKET', target: 'MDC-3' },
                { name: 'VAC', rule: 'GLOBAL_BASKET', target: 'VAC-3' },
              ],
            },
          ],
        },
        {
          id: 'b341fe4d-4cdf-4e0d-9203-a9c6cfb9025c',
          department_id: '9cfa61d3-ed11-4d78-9001-54c76035fbcb',
          semester: 1,
          min_credits: 21,
          max_credits: 21,
          slot_1_rule: 'FIXED',
          slot_1_target: 'KU01DSCPSY101',
          slot_2_rule: 'EXCLUDE_DEPT',
          slot_2_target: 'SBS',
          slot_3_rule: 'EXCLUDE_DEPT',
          slot_3_target: 'SBS',
          slot_4_rule: 'GLOBAL_BASKET',
          slot_4_target: 'MDC-1',
          slot_5_rule: 'GLOBAL_BASKET',
          slot_5_target: 'AEC-1',
          slot_6_rule: 'GLOBAL_BASKET',
          slot_6_target: 'AEC-2',
          slot_1_name: 'Major 1',
          slot_2_name: 'Minor 1',
          slot_3_name: 'Minor 2',
          slot_4_name: 'MDC ',
          slot_5_name: 'AEC 1',
          slot_6_name: 'AEC 2',
          pathways: [
            {
              id: '6fc5f211-411e-4896-978a-c97d4ce2890c',
              name: 'Default',
              slots: [
                { name: 'Major 1', rule: 'FIXED', target: 'KU01DSCPSY101' },
                { name: 'Minor 1', rule: 'EXCLUDE_DEPT', target: 'SBS' },
                { name: 'Minor 2', rule: 'EXCLUDE_DEPT', target: 'SBS' },
                { name: 'MDC ', rule: 'GLOBAL_BASKET', target: 'MDC-1' },
                { name: 'AEC 1', rule: 'GLOBAL_BASKET', target: 'AEC-1' },
                { name: 'AEC 2', rule: 'GLOBAL_BASKET', target: 'AEC-2' },
              ],
            },
          ],
        },
        {
          id: 'b6af96d9-e9eb-4535-b800-b365db289a6d',
          department_id: '71ba995f-fa2d-461b-8971-73c4fd00dac7',
          semester: 1,
          min_credits: 21,
          max_credits: 21,
          slot_1_rule: 'FIXED',
          slot_1_target: 'KU01DSCPES101',
          slot_2_rule: 'EXCLUDE_DEPT',
          slot_2_target: 'PES',
          slot_3_rule: 'EXCLUDE_DEPT',
          slot_3_target: 'PES',
          slot_4_rule: 'GLOBAL_BASKET',
          slot_4_target: 'MDC-1',
          slot_5_rule: 'GLOBAL_BASKET',
          slot_5_target: 'AEC-1',
          slot_6_rule: 'GLOBAL_BASKET',
          slot_6_target: 'AEC-2',
          slot_1_name: 'MAJOR',
          slot_2_name: 'MINOR 1',
          slot_3_name: 'MINOR 2',
          slot_4_name: 'MDC',
          slot_5_name: 'AEC 1',
          slot_6_name: 'AEC 2',
          pathways: [
            {
              id: '6fc5f211-411e-4896-978a-c97d4ce2890c',
              name: 'SEM 1',
              slots: [
                { name: 'MAJOR', rule: 'FIXED', target: 'KU01DSCPES101' },
                { name: 'MINOR 1', rule: 'EXCLUDE_DEPT', target: 'PES' },
                { name: 'MINOR 2', rule: 'EXCLUDE_DEPT', target: 'PES' },
                { name: 'MDC', rule: 'GLOBAL_BASKET', target: 'MDC-1' },
                { name: 'AEC 1', rule: 'GLOBAL_BASKET', target: 'AEC-1' },
                { name: 'AEC 2', rule: 'GLOBAL_BASKET', target: 'AEC-2' },
              ],
            },
          ],
        },
        {
          id: 'b7d83b09-9f29-451a-9192-3d7d945e6825',
          department_id: '7898c34b-e8bf-4acc-be44-9b42d185e605',
          semester: 3,
          min_credits: 22,
          max_credits: 22,
          slot_1_rule: 'FIXED',
          slot_1_target: 'KU03DSCECO201',
          slot_2_rule: 'FIXED',
          slot_2_target: 'KU03DSCECO202',
          slot_3_rule: 'FIXED',
          slot_3_target: 'KU03DSCECO203',
          slot_4_rule: 'FIXED',
          slot_4_target: 'KU03DSCECO204',
          slot_5_rule: 'GLOBAL_BASKET',
          slot_5_target: 'MDC-3',
          slot_6_rule: 'GLOBAL_BASKET',
          slot_6_target: 'VAC-3',
          slot_1_name: 'MAJOR 1',
          slot_2_name: 'MAJOR 2',
          slot_3_name: 'MAJOR 3',
          slot_4_name: 'MAJOR 4',
          slot_5_name: 'MDC ',
          slot_6_name: 'VAC',
          pathways: [
            {
              id: '6fc5f211-411e-4896-978a-c97d4ce2890c',
              name: 'Default',
              slots: [
                { name: 'MAJOR 1', rule: 'FIXED', target: 'KU03DSCECO201' },
                { name: 'MAJOR 2', rule: 'FIXED', target: 'KU03DSCECO202' },
                { name: 'MAJOR 3', rule: 'FIXED', target: 'KU03DSCECO203' },
                { name: 'MAJOR 4', rule: 'FIXED', target: 'KU03DSCECO204' },
                { name: 'MDC ', rule: 'GLOBAL_BASKET', target: 'MDC-3' },
                { name: 'VAC', rule: 'GLOBAL_BASKET', target: 'VAC-3' },
              ],
            },
          ],
        },
        {
          id: 'ba0cd4e4-c95f-4056-bd2f-1b49e86d481f',
          department_id: 'e814d190-e1c2-4731-b2ec-d97d5dc897e0',
          semester: 1,
          min_credits: 21,
          max_credits: 21,
          slot_1_rule: 'FIXED',
          slot_1_target: 'KU01DSCHIS101',
          slot_2_rule: 'EXCLUDE_DEPT',
          slot_2_target: 'HIS',
          slot_3_rule: 'EXCLUDE_DEPT',
          slot_3_target: 'HIS',
          slot_4_rule: 'GLOBAL_BASKET',
          slot_4_target: 'MDC-1',
          slot_5_rule: 'GLOBAL_BASKET',
          slot_5_target: 'AEC-1',
          slot_6_rule: 'GLOBAL_BASKET',
          slot_6_target: 'AEC-2',
          slot_1_name: 'Major 1',
          slot_2_name: 'Minor 1',
          slot_3_name: 'Minor 2',
          slot_4_name: 'MDC',
          slot_5_name: 'AEC 1',
          slot_6_name: 'AEC 2',
          pathways: [
            {
              id: '6fc5f211-411e-4896-978a-c97d4ce2890c',
              name: 'Default',
              slots: [
                { name: 'Major 1', rule: 'FIXED', target: 'KU01DSCHIS101' },
                { name: 'Minor 1', rule: 'EXCLUDE_DEPT', target: 'HIS' },
                { name: 'Minor 2', rule: 'EXCLUDE_DEPT', target: 'HIS' },
                { name: 'MDC', rule: 'GLOBAL_BASKET', target: 'MDC-1' },
                { name: 'AEC 1', rule: 'GLOBAL_BASKET', target: 'AEC-1' },
                { name: 'AEC 2', rule: 'GLOBAL_BASKET', target: 'AEC-2' },
              ],
            },
          ],
        },
        {
          id: 'c8064b33-3936-4fee-91ff-ffbc6e8b6816',
          department_id: '71ba995f-fa2d-461b-8971-73c4fd00dac7',
          semester: 3,
          min_credits: 22,
          max_credits: 22,
          slot_1_rule: 'FIXED',
          slot_1_target: 'KU03DSCPES201',
          slot_2_rule: 'FIXED',
          slot_2_target: 'KU03DSCPES202',
          slot_3_rule: 'FIXED',
          slot_3_target: 'KU03DSCPES203',
          slot_4_rule: 'FIXED',
          slot_4_target: 'KU03DSCPES204',
          slot_5_rule: 'GLOBAL_BASKET',
          slot_5_target: 'MDC-3',
          slot_6_rule: 'GLOBAL_BASKET',
          slot_6_target: 'VAC-3',
          slot_1_name: 'MAJOR 1',
          slot_2_name: 'MAJOR 2',
          slot_3_name: 'MAJOR 3',
          slot_4_name: 'MINOR 1',
          slot_5_name: 'MDC',
          slot_6_name: 'VAC',
          pathways: [
            {
              id: '6fc5f211-411e-4896-978a-c97d4ce2890c',
              name: 'Default',
              slots: [
                { name: 'MAJOR 1', rule: 'FIXED', target: 'KU03DSCPES201' },
                { name: 'MAJOR 2', rule: 'FIXED', target: 'KU03DSCPES202' },
                { name: 'MAJOR 3', rule: 'FIXED', target: 'KU03DSCPES203' },
                { name: 'MINOR 1', rule: 'FIXED', target: 'KU03DSCPES204' },
                { name: 'MDC', rule: 'GLOBAL_BASKET', target: 'MDC-3' },
                { name: 'VAC', rule: 'GLOBAL_BASKET', target: 'VAC-3' },
              ],
            },
          ],
        },
        {
          id: 'c9e59cc3-a643-484a-8d8a-dee319130e64',
          department_id: '96a54058-8437-46a3-9815-ae49deab0999',
          semester: 1,
          min_credits: 21,
          max_credits: 21,
          slot_1_rule: 'FIXED',
          slot_1_target: 'KU01DSCCSE101',
          slot_2_rule: 'DEPT_RESTRICTED',
          slot_2_target: 'MAT',
          slot_3_rule: 'DEPT_RESTRICTED',
          slot_3_target: 'STA',
          slot_4_rule: 'GLOBAL_BASKET',
          slot_4_target: 'MDC-1',
          slot_5_rule: 'GLOBAL_BASKET',
          slot_5_target: 'AEC-1',
          slot_6_rule: 'GLOBAL_BASKET',
          slot_6_target: 'AEC-2',
          slot_1_name: 'Major 1',
          slot_2_name: 'Minor 1',
          slot_3_name: 'Minor 2',
          slot_4_name: 'MDC',
          slot_5_name: 'AEC 1',
          slot_6_name: 'AEC 2',
          pathways: [
            {
              id: '6fc5f211-411e-4896-978a-c97d4ce2890c',
              name: 'Default',
              slots: [
                { name: 'Major 1', rule: 'FIXED', target: 'KU01DSCCSE101' },
                { name: 'Minor 1', rule: 'DEPT_RESTRICTED', target: 'MAT' },
                { name: 'Minor 2', rule: 'DEPT_RESTRICTED', target: 'STA' },
                { name: 'MDC', rule: 'GLOBAL_BASKET', target: 'MDC-1' },
                { name: 'AEC 1', rule: 'GLOBAL_BASKET', target: 'AEC-1' },
                { name: 'AEC 2', rule: 'GLOBAL_BASKET', target: 'AEC-2' },
              ],
            },
          ],
        },
        {
          id: 'd90d5cf3-fd22-47bb-9401-894f0565feb1',
          department_id: 'e814d190-e1c2-4731-b2ec-d97d5dc897e0',
          semester: 3,
          min_credits: 22,
          max_credits: 22,
          slot_1_rule: 'FIXED',
          slot_1_target: 'KU03DSCHIS201',
          slot_2_rule: 'FIXED',
          slot_2_target: 'KU03DSCHIS202',
          slot_3_rule: 'FIXED',
          slot_3_target: 'KU03DSCHIS203',
          slot_4_rule: 'EXCLUDE_DEPT',
          slot_4_target: 'HIS',
          slot_5_rule: 'GLOBAL_BASKET',
          slot_5_target: 'MDC-3',
          slot_6_rule: 'GLOBAL_BASKET',
          slot_6_target: 'VAC-3',
          slot_1_name: 'MAJOR 1 ',
          slot_2_name: 'MAJOR 2',
          slot_3_name: 'MAJOR 3',
          slot_4_name: 'MINOR',
          slot_5_name: 'MDC',
          slot_6_name: 'VAC',
          pathways: [
            {
              id: '6fc5f211-411e-4896-978a-c97d4ce2890c',
              name: 'Default',
              slots: [
                { name: 'MAJOR 1 ', rule: 'FIXED', target: 'KU03DSCHIS201' },
                { name: 'MAJOR 2', rule: 'FIXED', target: 'KU03DSCHIS202' },
                { name: 'MAJOR 3', rule: 'FIXED', target: 'KU03DSCHIS203' },
                { name: 'MINOR', rule: 'EXCLUDE_DEPT', target: 'HIS' },
                { name: 'MDC', rule: 'GLOBAL_BASKET', target: 'MDC-3' },
                { name: 'VAC', rule: 'GLOBAL_BASKET', target: 'VAC-3' },
              ],
            },
          ],
        },
      ]

      this.logger.log(`Upserting ${blueprintsData.length} semester blueprints...`)
      const { data: insertedBlueprints, error: blueprintsError } = await this.supabase.admin
        .from('semester_blueprints')
        .upsert(blueprintsData, { onConflict: 'department_id,semester' })
        .select('id')

      if (blueprintsError) {
        this.logger.error(`Blueprints upsert failed: ${JSON.stringify(blueprintsError)}`)
      } else {
        this.logger.log(
          `Successfully upserted ${insertedBlueprints?.length ?? blueprintsData.length} semester blueprints!`,
        )
      }

      // Verification summary
      const { count: totalCourses } = await this.supabase.admin
        .from('courses')
        .select('*', { count: 'exact', head: true })

      const { count: totalBlueprints } = await this.supabase.admin
        .from('semester_blueprints')
        .select('*', { count: 'exact', head: true })

      this.logger.log(
        `[SEED VERIFICATION] Total in DB -> Courses: ${totalCourses}, Semester Blueprints: ${totalBlueprints}`,
      )

      await this.supabase.admin.from('system_logs').insert({
        log_type: 'data_seed',
        status: 'success',
        route: 'seedCoursesAndBlueprints',
        metadata: {
          courses_upserted: insertedCourses?.length ?? coursesData.length,
          blueprints_upserted: insertedBlueprints?.length ?? blueprintsData.length,
          total_courses: totalCourses,
          total_blueprints: totalBlueprints,
        },
      })

      const statusObj = {
        timestamp: new Date().toISOString(),
        success: true,
        upserted_courses: insertedCourses?.length ?? coursesData.length,
        upserted_blueprints: insertedBlueprints?.length ?? blueprintsData.length,
        total_courses_in_db: totalCourses,
        total_blueprints_in_db: totalBlueprints,
      }
      try {
        fs.writeFileSync(
          path.resolve(process.cwd(), 'seed_status.json'),
          JSON.stringify(statusObj, null, 2),
          'utf-8',
        )
        fs.writeFileSync(
          'c:\\Users\\windows\\Fyimpcourseregistration\\seed_status.json',
          JSON.stringify(statusObj, null, 2),
          'utf-8',
        )
      } catch (err) {
        this.logger.warn(`Could not write local status file: ${err}`)
      }
    } catch (err: any) {
      this.logger.error(`Error executing seed: ${err?.message || err}`)
    }
  }

  async verifyBlueprints(): Promise<any> {
    try {
      const [{ data: depts }, { data: blueprints }] = await Promise.all([
        this.supabase.admin.from('departments').select('id, name, code'),
        this.supabase.admin.from('semester_blueprints').select('*').order('semester', { ascending: true }),
      ])

      if (!depts || !blueprints) {
        this.logger.error('verifyBlueprints: Failed to load departments or blueprints from database')
        return { error: 'Database entities not found' }
      }

      const deptMap = new Map(depts.map((d) => [d.code, d.id]))
      const deptIdToName = new Map(depts.map((d) => [d.id, d.name]))
      const deptIdToCode = new Map(depts.map((d) => [d.id, d.code]))

      const results: any[] = []
      let totalSlots = 0
      let passedSlots = 0
      let failedSlots = 0

      for (const bp of blueprints) {
        const deptCode = deptIdToCode.get(bp.department_id) || 'UNKNOWN'
        const deptName = deptIdToName.get(bp.department_id) || 'UNKNOWN'
        const pathways = (bp.pathways as any[]) || []

        if (pathways.length === 0) {
          results.push({
            deptCode,
            deptName,
            semester: bp.semester,
            status: 'FAILED',
            reason: 'No pathways defined',
          })
          continue
        }

        const pathway = pathways[0]
        const mockStudent: any = {
          userId: '00000000-0000-0000-0000-000000000000',
          campus_id: 'feed55c6-deea-46b7-9fa1-a97cfabf0838',
          department_id: bp.department_id,
          current_semester: bp.semester,
          role: 'student',
        }

        try {
          const resolvedSlots = await this.registrationsService.resolvePathwaySlots(
            pathway,
            mockStudent,
            deptMap,
            deptIdToName,
          )

          let totalCredits = 0
          const slotResults: any[] = []

          for (const slot of resolvedSlots) {
            totalSlots++
            const isFixed =
              slot.rule === 'FIXED' || slot.rule === 'CAMPUS_FIXED' || slot.rule === 'AEC_ELECT'

            if (isFixed) {
              if (!slot.course) {
                failedSlots++
                slotResults.push({
                  slot: slot.slot,
                  name: slot.name,
                  rule: slot.rule,
                  status: 'FAILED',
                  error: 'Fixed course not resolved',
                })
              } else {
                passedSlots++
                totalCredits += slot.course.credits
                slotResults.push({
                  slot: slot.slot,
                  name: slot.name,
                  rule: slot.rule,
                  status: 'PASSED',
                  course: `${slot.course.course_code} - ${slot.course.title}`,
                  credits: slot.course.credits,
                })
              }
            } else {
              const opts = slot.options || []
              if (opts.length === 0) {
                failedSlots++
                slotResults.push({
                  slot: slot.slot,
                  name: slot.name,
                  rule: slot.rule,
                  status: 'FAILED',
                  error: '0 available course options',
                })
              } else {
                passedSlots++
                totalCredits += opts[0].credits
                slotResults.push({
                  slot: slot.slot,
                  name: slot.name,
                  rule: slot.rule,
                  status: 'PASSED',
                  availableOptionsCount: opts.length,
                  topChoice: `${opts[0].course_code} - ${opts[0].title}`,
                  credits: opts[0].credits,
                })
              }
            }
          }

          const creditsValid = totalCredits >= bp.min_credits && totalCredits <= bp.max_credits

          results.push({
            deptCode,
            deptName,
            semester: bp.semester,
            min_credits: bp.min_credits,
            max_credits: bp.max_credits,
            simulatedCredits: totalCredits,
            creditsValid,
            status: creditsValid && slotResults.every((s) => s.status === 'PASSED') ? 'PASSED' : 'FAILED',
            slots: slotResults,
          })
        } catch (err: any) {
          results.push({
            deptCode,
            deptName,
            semester: bp.semester,
            status: 'ERROR',
            error: err.message,
          })
        }
      }

      const summary = {
        timestamp: new Date().toISOString(),
        total_blueprints: blueprints.length,
        passed_blueprints: results.filter((r) => r.status === 'PASSED').length,
        failed_blueprints: results.filter((r) => r.status !== 'PASSED').length,
        total_slots_tested: totalSlots,
        passed_slots: passedSlots,
        failed_slots: failedSlots,
        results,
      }

      try {
        fs.writeFileSync(
          'c:\\Users\\windows\\Fyimpcourseregistration\\blueprint_verification.json',
          JSON.stringify(summary, null, 2),
          'utf-8',
        )
        fs.writeFileSync(
          path.resolve(process.cwd(), 'blueprint_verification.json'),
          JSON.stringify(summary, null, 2),
          'utf-8',
        )
      } catch (e) {
        this.logger.warn(`Could not write blueprint_verification.json: ${e}`)
      }

      this.logger.log(
        `Automated Blueprint Verification complete: ${summary.passed_blueprints}/${summary.total_blueprints} passed. ${summary.passed_slots}/${summary.total_slots_tested} slots passed.`,
      )

      return summary
    } catch (err: any) {
      this.logger.error(`verifyBlueprints error: ${err?.message || err}`)
      return { error: err.message }
    }
  }

  async getStatus() {
    const { count: totalCourses } = await this.supabase.admin
      .from('courses')
      .select('*', { count: 'exact', head: true })

    const { count: totalBlueprints } = await this.supabase.admin
      .from('semester_blueprints')
      .select('*', { count: 'exact', head: true })

    const { data: latestLog } = await this.supabase.admin
      .from('system_logs')
      .select('*')
      .eq('log_type', 'data_seed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return {
      success: true,
      total_courses: totalCourses,
      total_blueprints: totalBlueprints,
      latest_seed_log: latestLog,
    }
  }

  /**
   * Ensures test accounts for the teaching_staff role exist with known credentials.
   */
  async seedTeachingStaffUsers() {
    this.logger.log('Checking and ensuring Teaching Staff test accounts...')

    // Clean up deprecated redundant placeholder account if exists so each campus has strictly 1 teaching_staff
    try {
      const { data: oldFaculty } = await this.supabase.admin
        .from('faculty')
        .select('id')
        .eq('email', 'teachingstaff@mangat.internal')
        .maybeSingle()

      if (oldFaculty?.id) {
        await this.supabase.admin.from('faculty').delete().eq('id', oldFaculty.id)
        await this.supabase.admin.auth.admin.deleteUser(oldFaculty.id).catch(() => {})
        this.logger.log('Cleaned up deprecated teachingstaff@mangat.internal account.')
      }
    } catch (cleanupErr: any) {
      this.logger.warn(`Could not clean up deprecated staff account: ${cleanupErr?.message || cleanupErr}`)
    }

    const staffAccounts = [
      {
        email: 'teachingstaff@ku.ac.in',
        password: 'TeachingStaff@123',
        full_name: 'Dr. K. Raman (Teaching Staff)',
        role: 'teaching_staff',
        department_id: null, // Campus-level general staff across all departments
        campus_id: '5b5289d5-17eb-43ba-832e-19883e9eaada', // Mangat Campus
      },
      {
        email: 'teachingstaff@thalas.internal',
        password: 'TeachingStaff@123',
        full_name: 'Teaching Staff Thalas',
        role: 'teaching_staff',
        department_id: null, // Campus-level general staff across all departments
        campus_id: 'feed55c6-deea-46b7-9fa1-a97cfabf0838', // Thalas Campus
      },
    ]

    for (const acc of staffAccounts) {
      try {
        // 1. Check if auth user exists
        const { data: authList } = await this.supabase.admin.auth.admin.listUsers()
        let authUser = (authList?.users || []).find((u) => u.email?.toLowerCase() === acc.email.toLowerCase())

        if (!authUser) {
          const { data: created, error: createErr } = await this.supabase.admin.auth.admin.createUser({
            email: acc.email,
            password: acc.password,
            email_confirm: true,
            user_metadata: { role: acc.role },
            app_metadata: {
              role: acc.role,
              campus_id: acc.campus_id,
              department_id: acc.department_id,
            },
          })
          if (createErr) {
            this.logger.warn(`Could not create auth account for ${acc.email}: ${createErr.message}`)
            continue
          }
          authUser = created.user
        } else {
          // Do NOT overwrite existing user passwords in production
          await this.supabase.admin.auth.admin.updateUserById(authUser.id, {
            user_metadata: { role: acc.role },
            app_metadata: {
              role: acc.role,
              campus_id: acc.campus_id,
              department_id: acc.department_id,
            },
          })
        }

        if (authUser) {
          // 2. Ensure faculty table record exists and has role 'teaching_staff'
          const { error: upsertErr } = await this.supabase.admin
            .from('faculty')
            .upsert(
              {
                id: authUser.id,
                full_name: acc.full_name,
                email: acc.email,
                role: acc.role,
                department_id: acc.department_id,
                campus_id: acc.campus_id,
              },
              { onConflict: 'id' }
            )

          if (upsertErr) {
            this.logger.warn(`Could not upsert faculty row for ${acc.email}: ${upsertErr.message}`)
          } else {
            this.logger.log(`Teaching staff account verified: ${acc.email} (${acc.full_name})`)
          }
        }
      } catch (err: any) {
        this.logger.error(`Error provisioning teaching staff ${acc.email}: ${err?.message || err}`)
      }
    }
  }
}
